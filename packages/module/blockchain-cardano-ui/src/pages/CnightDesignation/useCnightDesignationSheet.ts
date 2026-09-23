import {
  convertLovelacesToAda,
  getCardanoNativeTokenInfoForNetwork,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import {
  CardanoTokenPriceId,
  FEATURE_FLAG_TOKEN_PRICING,
  TOKEN_PRICING_NETWORK_TYPE,
} from '@lace-contract/token-pricing';
import {
  CardanoDustNetwork,
  dustAddressToCoinPubkeyHex,
} from '@lace-lib/cnight-dust-designation';
import { NavigationControls } from '@lace-lib/navigation';
import {
  convertAmountToDenominated,
  valueToLocale,
} from '@lace-lib/util-render';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { NightDesignationFlowSliceState } from '@lace-contract/cardano-context';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export type CnightTargetMode = 'external' | 'wallet';

export type CnightActionMode = 'deregister' | 'designate' | 'update';

export type CnightWalletTarget = {
  accountId: string;
  accountName: string;
  dustAddress: string;
  coinPubkeyHex: string;
};

type CnightDesignationStep =
  | 'building'
  | 'error'
  | 'form'
  | 'processing'
  | 'review'
  | 'success';

const stepFromStatus = (
  status: NightDesignationFlowSliceState['status'],
): CnightDesignationStep => {
  switch (status) {
    case 'Building':
      return 'building';
    case 'Summary':
      return 'review';
    case 'AwaitingConfirmation':
    case 'Processing':
      return 'processing';
    case 'Success':
      return 'success';
    case 'Error':
      return 'error';
    case 'Idle':
      return 'form';
  }
};

export const useCnightDesignationSheet = (
  props: SheetScreenProps<SheetRoutes.CnightDesignation>,
) => {
  const { accountId } = props.route.params;

  const state = useLaceSelector(
    'nightDesignationFlow.selectState',
  ) as NightDesignationFlowSliceState;
  const networkType = useLaceSelector('network.selectNetworkType');
  const activeAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const allAddresses = useLaceSelector('addresses.selectAllAddresses');
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');
  const allPrices = useLaceSelector('tokenPricing.selectPrices');
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');
  const designationIndex = useLaceSelector(
    'nightDesignationIndex.selectIndexByAccount',
  );

  const dispatchDesignationRequested = useDispatchLaceAction(
    'nightDesignationFlow.designationRequested',
  );
  const dispatchIndexRefresh = useDispatchLaceAction(
    'nightDesignationIndex.refreshRequested',
  );
  const dispatchConfirmed = useDispatchLaceAction(
    'nightDesignationFlow.confirmed',
    true,
  );
  const dispatchReset = useDispatchLaceAction(
    'nightDesignationFlow.reset',
    true,
  );

  // The designation flow slice is a single shared instance, not scoped per
  // account (unlike the designation index), so a reused screen must reset it on
  // every account change, not only on mount — else a fresh account inherits the
  // prior one's terminal state. Reset is a no-op from user confirm onward
  // (state-machine design), so an unmount- or param-change reset can't
  // interrupt a signing or a submit.
  // `resetFor` gates the mapped step to the form until the reset for THIS account
  // lands — the effect runs post-paint, so keying on accountId (not a mount-
  // latched bool) keeps the first frame after an open or param change from
  // flashing the prior run's step.
  const dispatchResetRef = useRef(dispatchReset);
  dispatchResetRef.current = dispatchReset;
  const [resetFor, setResetFor] = useState<typeof accountId>();
  useEffect(() => {
    dispatchResetRef.current();
    setResetFor(accountId);
    return () => {
      dispatchResetRef.current();
    };
  }, [accountId]);

  // A confirmed run now finishes with the sheet closed, so it can turn
  // terminal while the sheet is open on ANOTHER account — where canContinue
  // reads `status` raw and the accountId-keyed reset above never re-fires.
  // Known limit: a foreign run still IN FLIGHT keeps the CTAs disabled here.
  useEffect(() => {
    if (
      (state.status === 'Success' || state.status === 'Error') &&
      state.accountId !== accountId
    ) {
      dispatchResetRef.current();
    }
  }, [state, accountId]);

  // Re-read whether the account is already designated (drives the manage view +
  // the current target) on every open — the on-chain script-address scan is the
  // source of truth (no optimistic writes; matches Carbon).
  //
  // The re-read is dispatched from a post-paint effect, so reading the index
  // directly would flash the previous scan's result (a stale manage/form view)
  // for one frame before the effect flips it to refreshing. Gate on that:
  // present the loader until the refresh is requested for THIS account, so a
  // reopen goes straight to it. Keyed by accountId (not a bare bool) so a param
  // change on a reused screen re-gates too.
  //
  // Except while the account is settling a designation it submitted: a scan
  // started here can still be in flight when the index drops the settling guard,
  // writing its pre-transaction answer over it as settled. The settling
  // side-effect owns that re-read; this one resumes once the guard clears.
  const settlingTxId = designationIndex[accountId]?.settling?.txId;
  const dispatchIndexRefreshRef = useRef(dispatchIndexRefresh);
  dispatchIndexRefreshRef.current = dispatchIndexRefresh;
  const [detectionRequestedFor, setDetectionRequestedFor] =
    useState<typeof accountId>();
  useEffect(() => {
    if (settlingTxId === undefined)
      dispatchIndexRefreshRef.current({ accountId });
    setDetectionRequestedFor(accountId);
  }, [accountId, settlingTxId]);
  const entry =
    detectionRequestedFor === accountId
      ? designationIndex[accountId]
      : undefined;

  // `settling` is unresolved, not an answer: the snapshot predates a designation
  // this wallet has already submitted. It outranks a failed scan too — the retry
  // that state offers would start exactly the scan the guard above withholds.
  const isSettling = entry?.settling !== undefined;
  // A failed scan leaves designate-vs-manage unknown, so every write action is
  // blocked. The build refuses a duplicate designation on its own, so this
  // keeps the user off a path whose only outcome is that refusal.
  const isDetectionFailed = !isSettling && entry?.failed === true;
  const isDetecting =
    !isDetectionFailed &&
    (isSettling || entry?.snapshot === undefined || entry.refreshing);
  // Everything below reads "the account's designation". The index keeps its last
  // snapshot through a re-read, a supersession and a failure; none of those is
  // that answer, and seeding the form off one acts on a read the sheet refuses.
  const snapshot =
    isDetecting || isDetectionFailed ? undefined : entry?.snapshot;

  const isDesignated = snapshot?.registration !== undefined;
  const currentTargetHex = snapshot?.registration?.dustPubkeyHex;

  const cardanoAccount = useMemo(
    () => activeAccounts.find(account => account.accountId === accountId),
    [activeAccounts, accountId],
  );
  const walletId = cardanoAccount?.walletId;
  const wallet = useLaceSelector('wallets.selectWalletById', walletId ?? '');

  const dustNetwork =
    networkType === 'mainnet'
      ? CardanoDustNetwork.mainnet
      : CardanoDustNetwork.testnet;

  // "self" targets: Midnight accounts in the same wallet on the same
  // mainnet/testnet, resolved to their dust address (and thus coin pubkey)
  // via the bech32m decoder — no midnight-context coupling (ADR 14).
  const walletTargets = useMemo<CnightWalletTarget[]>(() => {
    if (!wallet || !cardanoAccount) return [];
    const midnightAccounts = wallet.accounts.filter(
      account =>
        account.blockchainName === 'Midnight' &&
        account.networkType === cardanoAccount.networkType,
    );
    return midnightAccounts.flatMap(midnightAccount => {
      const dustAddress = allAddresses
        .filter(addr => addr.accountId === midnightAccount.accountId)
        .map(addr => addr.address)
        .find(address => {
          try {
            // Guard the decoded network too (mirrors the external-target guard
            // below): the build keys the tx off the network from the Cardano
            // chain id, so a sibling on another network must be dropped here.
            const decoded = dustAddressToCoinPubkeyHex(address);
            return decoded.kind === 'dust' && decoded.network === dustNetwork;
          } catch {
            return false;
          }
        });
      if (!dustAddress) return [];
      const { coinPubkeyHex } = dustAddressToCoinPubkeyHex(dustAddress);
      return [
        {
          accountId: midnightAccount.accountId,
          accountName: midnightAccount.metadata.name,
          dustAddress,
          coinPubkeyHex,
        },
      ];
    });
  }, [wallet, cardanoAccount, allAddresses, dustNetwork]);

  const isWalletTargetAvailable = walletTargets.length > 0;

  const [rawTargetMode, setRawTargetMode] =
    useState<CnightTargetMode>('wallet');
  // The "My wallet" tab is disabled when no sibling Midnight account resolves a
  // dust target (the common Cardano-only case). Fall back to the external tab so
  // the sheet never strands the user on a disabled, empty tab with no cue.
  const targetMode: CnightTargetMode = isWalletTargetAvailable
    ? rawTargetMode
    : 'external';

  // The manage view has no mode toggle: the primary CTA designates when the
  // account isn't yet designated and changes the target when it is; "stop
  // generating" is a separate destructive action. Once a designation is
  // requested the flow state carries the action, which drives the review copy.
  const flowAction: CnightActionMode | undefined =
    'action' in state ? state.action : undefined;
  const formActionMode: CnightActionMode = isDesignated
    ? 'update'
    : 'designate';
  const actionMode: CnightActionMode = flowAction ?? formActionMode;

  const [selectedTargetId, setSelectedTargetId] = useState<string>();
  const [externalAddress, setExternalAddress] = useState('');
  // Guard for the seeding effect below. State, not a ref, so the render-time
  // account-change block can clear it — and it must clear on EVERY change, not
  // just when the new account seeds, else a return visit never re-seeds.
  const [seededDefaultsFor, setSeededDefaultsFor] = useState<
    typeof accountId | undefined
  >(undefined);

  // Component-local form fields must clear on account change, else a reused
  // screen carries the prior account's pasted target / tab choice into Continue
  // — an irreversible designation to the wrong account. Reset in render, not an
  // effect, so no stale value survives even the change frame. Clearing the
  // selection is not fail-closed: it re-resolves to the NEW account's own
  // walletTargets[0] until the seeding effect re-picks.
  const [formFieldsAccount, setFormFieldsAccount] = useState(accountId);
  if (formFieldsAccount !== accountId) {
    setFormFieldsAccount(accountId);
    setSelectedTargetId(undefined);
    setSeededDefaultsFor(undefined);
    setRawTargetMode('wallet');
    setExternalAddress('');
  }

  // The sibling already designated on-chain (if any). Marks the "Current" picker
  // row — the raw hex shown above isn't matchable by eye — and seeds the
  // pre-selection below.
  const currentWalletTargetId = useMemo(
    () =>
      currentTargetHex === undefined
        ? undefined
        : walletTargets.find(
            target =>
              target.coinPubkeyHex.toLowerCase() ===
              currentTargetHex.toLowerCase(),
          )?.accountId,
    [walletTargets, currentTargetHex],
  );

  // Preselect a wallet target once targets AND detection resolve: the current
  // recipient when already designated (so update mode opens on it), else the
  // first. Wait for detection (isDetecting) so the current target is known
  // before seeding; the per-account guard then keeps a later user selection
  // from being clobbered.
  useEffect(() => {
    if (
      seededDefaultsFor === accountId ||
      walletTargets.length === 0 ||
      isDetecting
    )
      return;
    setSeededDefaultsFor(accountId);
    setSelectedTargetId(currentWalletTargetId ?? walletTargets[0].accountId);
  }, [
    accountId,
    walletTargets,
    isDetecting,
    currentWalletTargetId,
    seededDefaultsFor,
  ]);

  const selectedWalletTarget = useMemo(
    () =>
      walletTargets.find(target => target.accountId === selectedTargetId) ??
      walletTargets[0],
    [walletTargets, selectedTargetId],
  );

  // Typing an external recipient IS choosing the external tab — the input only
  // renders in that mode, so this cannot fire from the wallet tab. Commit the
  // mode rather than leaving the fallback derived, else a sibling address
  // hydrating later flips it back and Continue designates the sibling.
  // Synchronous, not an effect, which would leave a frame for that flip.
  const setExternalAddressAndCommitMode = useCallback((value: string) => {
    setExternalAddress(value);
    if (value.trim() !== '') setRawTargetMode('external');
  }, []);

  const externalTarget = useMemo(() => {
    const trimmed = externalAddress.trim();
    if (!trimmed) return { status: 'empty' as const };
    try {
      const decoded = dustAddressToCoinPubkeyHex(trimmed);
      if (decoded.network !== dustNetwork) {
        return { status: 'network-mismatch' as const };
      }
      return { status: 'valid' as const, coinPubkeyHex: decoded.coinPubkeyHex };
    } catch {
      return { status: 'invalid' as const };
    }
  }, [externalAddress, dustNetwork]);

  const resolvedDustPubkeyHex =
    targetMode === 'wallet'
      ? selectedWalletTarget?.coinPubkeyHex
      : externalTarget.status === 'valid'
      ? externalTarget.coinPubkeyHex
      : undefined;

  const nativeTokenInfo = useMemo(
    () => getCardanoNativeTokenInfoForNetwork(networkType),
    [networkType],
  );

  const feeFormatted = useMemo(() => {
    const fees = 'fees' in state ? state.fees : [];
    if (fees.length === 0) return undefined;
    const denominated = convertAmountToDenominated(
      fees[0].amount.toString(),
      nativeTokenInfo.decimals,
    );
    return `${valueToLocale(denominated)} ${nativeTokenInfo.displayShortName}`;
  }, [state, nativeTokenInfo]);

  const isTokenPricingEnabled = useMemo(
    () =>
      featureFlags.some(flag => flag.key === FEATURE_FLAG_TOKEN_PRICING) &&
      networkType === TOKEN_PRICING_NETWORK_TYPE,
    [featureFlags, networkType],
  );

  const feeFiatFormatted = useMemo(() => {
    const fees = 'fees' in state ? state.fees : [];
    const adaPrice = isTokenPricingEnabled
      ? allPrices?.[CardanoTokenPriceId(LOVELACE_TOKEN_ID)]?.price
      : undefined;
    if (fees.length === 0 || adaPrice == null || !currency) return undefined;
    const adaAmount = Number(convertLovelacesToAda(fees[0].amount));
    return `${valueToLocale(adaAmount * adaPrice, 2, 2)} ${currency.name}`;
  }, [state, isTokenPricingEnabled, allPrices, currency]);

  const liveReviewTarget = useMemo(
    () =>
      targetMode === 'wallet'
        ? {
            isOwn: true,
            accountName: selectedWalletTarget?.accountName ?? '',
            address: selectedWalletTarget?.dustAddress ?? '',
          }
        : {
            isOwn: false,
            accountName: '',
            address: externalAddress.trim(),
          },
    [targetMode, selectedWalletTarget, externalAddress],
  );

  // Snapshot of the recipient taken when the build was requested, in the same
  // render as the dispatched `dustPubkeyHex` so the two can't diverge. Review
  // renders this, not the live form, so the shown recipient always equals the
  // irreversible designation being signed — a correctness guard independent of
  // the build-time form lock (isFormLocked below). `Idle` (fresh open, or after
  // "back") falls through to live; the next request overwrites it.
  const [committedReviewTarget, setCommittedReviewTarget] =
    useState<typeof liveReviewTarget>();
  const reviewTarget =
    state.status === 'Idle'
      ? liveReviewTarget
      : committedReviewTarget ?? liveReviewTarget;

  // The flow slice is a shared singleton and its account-change reset is async,
  // so a reused screen can briefly read the PRIOR account's terminal state (a
  // built Summary) after resetFor flips but before the reset lands. Gate step on
  // the flow's own accountId too, else that window surfaces the prior account's
  // review + Confirm — submitting its already-built, irreversible tx.
  const isFlowForThisAccount =
    state.status === 'Idle' || state.accountId === accountId;
  const step =
    resetFor === accountId && isFlowForThisAccount
      ? stepFromStatus(state.status)
      : 'form';

  // The form stays on screen while the build runs (the footer button spins), so
  // lock the target inputs to keep the visible selection consistent with the tx
  // being built (correctness itself is the snapshot's job, above).
  const isFormLocked = step === 'building';

  // In manage mode, block "Change target" when the selection equals the current
  // target — a redundant no-op tx. Compare case-insensitively: the two hexes
  // come from different producers (current from the on-chain datum decode,
  // selected from dustAddressToCoinPubkeyHex).
  const isSameAsCurrentTarget =
    isDesignated &&
    resolvedDustPubkeyHex !== undefined &&
    currentTargetHex !== undefined &&
    resolvedDustPubkeyHex.toLowerCase() === currentTargetHex.toLowerCase();

  // Update withdraws from the dust-generator script reward account; when that
  // account isn't registered on-chain (or the probe failed), Conway rejects the
  // withdrawal, so changing the target isn't submittable — only stopping is.
  const isUpdateBlocked =
    isDesignated && snapshot?.scriptStakeCredentialRegistered !== true;

  // Primary CTA (designate / change target) needs a resolved, distinct target.
  const canContinue =
    state.status === 'Idle' &&
    resolvedDustPubkeyHex !== undefined &&
    !isSameAsCurrentTarget &&
    !isUpdateBlocked &&
    !isDetectionFailed;

  // "Stop generating" (deregister) needs no target — only an idle flow. Blocked
  // on a failed scan too: with the designation state unknown, offering to stop
  // asserts a designation we could not confirm exists.
  const canStop = state.status === 'Idle' && !isDetectionFailed;

  // Both handlers re-check rather than trusting the CTA's disabled prop: the
  // footer is installed by a post-paint effect, so the frame in which the scan
  // fails still paints the previous, enabled footer. The re-check is only as
  // strong as the terms above — neither reads `isDetecting`, so a tap in the
  // frame an account change opens (the new account unread, the old account's
  // footer still painted) still passes. The build refuses what that would
  // request, so the cost is a spurious error rather than a wrong designation.
  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    if (!resolvedDustPubkeyHex) return;
    setCommittedReviewTarget(liveReviewTarget);
    dispatchDesignationRequested({
      accountId,
      action: formActionMode,
      dustPubkeyHex: resolvedDustPubkeyHex,
    });
  }, [
    canContinue,
    formActionMode,
    resolvedDustPubkeyHex,
    liveReviewTarget,
    accountId,
    dispatchDesignationRequested,
  ]);

  const handleStopGenerating = useCallback(() => {
    if (!canStop) return;
    dispatchDesignationRequested({ accountId, action: 'deregister' });
  }, [canStop, accountId, dispatchDesignationRequested]);

  const handleConfirm = useCallback(() => {
    dispatchConfirmed();
  }, [dispatchConfirmed]);

  const handleBackToForm = useCallback(() => {
    dispatchReset();
  }, [dispatchReset]);

  const handleClose = useCallback(() => {
    NavigationControls.closeSheet();
  }, []);

  // One-shot per failure: the ref blocks a double-tap landing in the same frame
  // (before the error screen re-renders), the state drives the button's disabled
  // prop, and both clear once detection leaves 'error' — so the re-scan's own
  // outcome, not the tap, decides whether Retry is offered again.
  const hasRetryDispatchedRef = useRef(false);
  const [hasRetryDispatched, setHasRetryDispatched] = useState(false);
  useEffect(() => {
    if (!isDetectionFailed) {
      hasRetryDispatchedRef.current = false;
      setHasRetryDispatched(false);
    }
  }, [isDetectionFailed]);

  const canRetryDetection = isDetectionFailed && !hasRetryDispatched;

  const retryDetection = useCallback(() => {
    if (!isDetectionFailed || hasRetryDispatchedRef.current) return;
    hasRetryDispatchedRef.current = true;
    setHasRetryDispatched(true);
    dispatchIndexRefreshRef.current({ accountId });
  }, [accountId, isDetectionFailed]);

  return {
    step,
    actionMode,
    isDesignated,
    isDetecting,
    isDetectionFailed,
    canRetryDetection,
    retryDetection,
    currentTargetHex,
    currentWalletTargetId,
    targetMode,
    setTargetMode: setRawTargetMode,
    walletTargets,
    isWalletTargetAvailable,
    selectedTargetId: selectedWalletTarget?.accountId,
    setSelectedTargetId,
    externalAddress,
    setExternalAddress: setExternalAddressAndCommitMode,
    externalTargetStatus: externalTarget.status,
    isFormLocked,
    canContinue,
    canStop,
    isSameAsCurrentTarget,
    isUpdateBlocked,
    feeFormatted,
    feeFiatFormatted,
    reviewTarget,
    txId: state.status === 'Success' ? state.txId : undefined,
    errorTranslationKeys:
      state.status === 'Error' ? state.errorTranslationKeys : undefined,
    // The concrete failure reason (e.g. a Conway phase-1 rejection or a build
    // error) behind the friendly subtitle — surfaced as a StatusSheet detail
    // line so the error is actionable, not just "we couldn't build".
    errorDetail: state.status === 'Error' ? state.error?.message : undefined,
    handleContinue,
    handleStopGenerating,
    handleConfirm,
    handleBackToForm,
    handleClose,
  };
};
