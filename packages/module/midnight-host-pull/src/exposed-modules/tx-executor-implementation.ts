// The guest's Midnight tx executor (ADR 47/D8). Unlike Cardano/Bitcoin — where
// the guest builds and the host only signs — the Midnight engine owns the state
// a build needs, so the host runs the WHOLE sign→prove→submit pipeline
// (`midnight.requestSend`), and this executor only:
//   • build   → serialize the transfer FACTS (amount / receiver / token / kind)
//               and report a PLACEHOLDER 0 DUST fee (the real fee is computed by
//               the host engine and rendered on the host sign surface at approve
//               time — D6; the guest cannot know it, so the send-flow fee line
//               shows 0 until the host summary. Documented UX difference.)
//   • confirm → `midnight.requestSend` + poll `getSendResult` to the terminal
//               outcome; the host has already submitted by then, so the txId is
//               threaded through `serializedTx`.
//   • submit  → pass the txId back (already-submitted host-side).

import { getDustTokenIdByNetwork } from '@lace-contract/midnight-context';
import { pollCeremonyOutcome } from '@lace-lib/extension-shell-client';
import { BigNumber, HexBytes } from '@lace-lib/util';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';

import {
  getMidnightSendResult,
  requestMidnightSend,
  requestMidnightSync,
} from '../lace-client';

import type { MidnightPublicAccountProps } from '../mappers';
import type {
  MidnightSDKNetworkId,
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata,
  MidnightTokenKind,
} from '@lace-contract/midnight-context';
import type {
  MakeTxExecutorImplementation,
  TxConfirmationResult,
  TxErrorTranslationKeys,
  TxExecutorImplementation,
} from '@lace-contract/tx-executor';
import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  LaceResult,
  MidnightSendParams,
  MidnightSendResult,
} from '@lace-lib/extension-shell-api';
import type { Logger } from 'ts-log';

/** The transfer facts serialized by build and re-read by confirm — the guest's
 * own wire (both ends are this module), so `amount` rides as a decimal string
 * (avoids BigNumber JSON pitfalls). */
type WireTxParams = {
  amount: string;
  receiverAddress: string;
  type: string;
  tokenKind: MidnightTokenKind;
};

/** Recover the account's SDK network from its MidnightAccountId
 * (`${walletId}-mn-${accountIndex}-${networkId}`) — only needed to satisfy the
 * dust-token helper's signature (the fee token is network-agnostic: DUST). */
const midnightNetworkFromAccountId = (
  accountId: AccountId,
): MidnightSDKNetworkId => {
  const rest = accountId.split('-mn-')[1] ?? '';
  return rest.slice(rest.indexOf('-') + 1) as MidnightSDKNetworkId;
};

const genericConfirmError = (): TxConfirmationResult => ({
  success: false,
  errorTranslationKeys: {
    title: 'tx-executor.confirmation-error.generic.title',
    subtitle: 'tx-executor.confirmation-error.generic.subtitle',
  },
});

/** Host-recorded send-failure reasons a user can act on, paired with the copy
 * that says what to do. Mirrors @lace-module/midnight-sync's own balancer-string
 * mapping (store/tx-executor/error-mapping.ts) — replicated rather than shared
 * because modules never import from other modules (ADR 14). Matched by substring:
 * the host forwards the SDK's message verbatim, wrapped in its own context. */
const REASON_SUBTITLES: readonly (readonly [
  string,
  TxErrorTranslationKeys['subtitle'],
])[] = [
  [
    'Insufficient Funds: could not balance dust',
    'tx-executor.building-error.insufficient-dust',
  ],
  [
    'Not enough Dust generated to pay the fee',
    'tx-executor.building-error.insufficient-dust',
  ],
  [
    'No dust tokens found in the wallet state',
    'tx-executor.building-error.insufficient-dust',
  ],
  ['Insufficient funds', 'tx-executor.building-error.insufficient-funds'],
];

/** The host's reason rendered as confirmation copy, or the generic error when
 * it is absent or unrecognised. */
const confirmErrorFor = (reason: string | undefined): TxConfirmationResult => {
  const subtitle = REASON_SUBTITLES.find(
    ([pattern]) => reason?.includes(pattern) === true,
  )?.[1];
  return subtitle === undefined
    ? genericConfirmError()
    : {
        success: false,
        errorTranslationKeys: {
          title: 'tx-executor.confirmation-error.generic.title',
          subtitle,
        },
      };
};

type SendOutcome =
  | { kind: 'confirmed'; txId: string }
  | { kind: 'failed'; reason?: string }
  | { kind: 'pending' };

/** Host error codes a repeat poll can only answer the same way: the method is
 * not served, the ceremony id is rejected, or the gate refuses the call. */
const TERMINAL_POLL_ERROR_CODES: readonly string[] = [
  'invalid-params',
  'refused',
  'unsupported',
];

/**
 * How many CONSECUTIVE failed polls are tolerated before the send is reported
 * failed. Backstop for the terminal failures that arrive as the catch-all
 * 'internal' — above all a lost send record ("unknown ceremony", the host throws
 * and the gate maps it to 'internal'), which is indistinguishable from a
 * transient blip by code alone. Without it the flow sits on the 15-minute
 * `pollCeremonyOutcome` ceiling with the send screen stuck.
 */
const MAX_CONSECUTIVE_POLL_ERRORS = 10;

/** The poll tail: classify one `getSendResult` answer, tracking the consecutive
 * error run across calls (one classifier per ceremony). */
const makeClassifySend = () => {
  let consecutiveErrors = 0;
  return (result: LaceResult<MidnightSendResult>): SendOutcome => {
    if (!result.ok) {
      consecutiveErrors += 1;
      if (TERMINAL_POLL_ERROR_CODES.includes(result.error.code)) {
        return { kind: 'failed' };
      }
      // A transient host error is tolerated as "keep polling" while the budget
      // lasts.
      return consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS
        ? { kind: 'failed' }
        : { kind: 'pending' };
    }
    consecutiveErrors = 0;
    switch (result.value.status) {
      case 'confirmed':
        return { kind: 'confirmed', txId: result.value.txId };
      case 'failed':
        return { kind: 'failed', reason: result.value.reason };
      case 'cancelled':
        return { kind: 'failed' };
      case 'pending':
        return { kind: 'pending' };
    }
  };
};

const buildTx: TxExecutorImplementation<
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata
>['buildTx'] = ({ accountId, txParams, blockchainSpecificSendFlowData }) => {
  // Dust designation is a monolith-only advanced flow with no wire method (the
  // host exposes a transfer-only `requestSend`, ADR 47) — fail closed in the
  // guest rather than mis-send it as a plain transfer.
  if (blockchainSpecificSendFlowData.flowType === 'dust-designation') {
    return of({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
  }

  // Guard the transfer read (mirrors Cardano/Bitcoin): a form with no transfers
  // reaches here as an empty `tokenTransfers`, and destructuring `[0]` would
  // throw synchronously — this executor is invoked outside any rx pipe, so the
  // throw would tear down the tx-executor subscription for the whole session.
  const firstTransfer = txParams[0]?.tokenTransfers[0];
  if (!firstTransfer) {
    return of({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
  }

  const { address } = txParams[0];
  const { normalizedAmount, token } = firstTransfer;
  if (!token.metadata) {
    return of({
      success: false,
      errorTranslationKey: 'tx-executor.building-error.generic',
    });
  }

  const wireParams: WireTxParams = {
    amount: normalizedAmount.toString(),
    receiverAddress: address,
    type: token.tokenId,
    tokenKind: token.metadata.blockchainSpecific.kind,
  };

  return of({
    success: true,
    serializedTx: HexBytes.fromUTF8(JSON.stringify(wireParams)),
    fees: [
      {
        amount: BigNumber(0n),
        tokenId: getDustTokenIdByNetwork(
          midnightNetworkFromAccountId(accountId),
        ),
      },
    ],
  });
};

const previewTx: TxExecutorImplementation<
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata
>['previewTx'] = () => of({ minimumAmount: BigNumber(1n), success: true });

const discardTx: TxExecutorImplementation['discardTx'] = () =>
  of({ success: true });

const makeConfirmTx =
  (
    logger: Logger,
  ): TxExecutorImplementation<
    MidnightSpecificSendFlowData,
    MidnightSpecificTokenMetadata
  >['confirmTx'] =>
  ({ wallet, accountId, serializedTx }) => {
    const account = wallet.accounts.find(a => a.accountId === accountId);
    if (!account || account.blockchainName !== 'Midnight') {
      return of(genericConfirmError());
    }
    const { accountIndex, networkId } =
      account.blockchainSpecific as MidnightPublicAccountProps;

    let wireParams: WireTxParams;
    try {
      wireParams = JSON.parse(
        HexBytes.toUTF8(HexBytes(serializedTx)),
      ) as WireTxParams;
    } catch (error) {
      logger.error(error);
      return of(genericConfirmError());
    }

    const params: MidnightSendParams = {
      walletId: wallet.walletId,
      accountIndex,
      network: networkId,
      amount: wireParams.amount,
      receiverAddress: wireParams.receiverAddress,
      type: wireParams.type,
      tokenKind: wireParams.tokenKind,
    };

    return from(requestMidnightSend(params)).pipe(
      switchMap(handle => {
        if (!handle.ok) return of(genericConfirmError());
        const { ceremonyId } = handle.value;
        const classifySend = makeClassifySend();
        return pollCeremonyOutcome<SendOutcome>(
          async () => getMidnightSendResult(ceremonyId).then(classifySend),
          { kind: 'failed' },
        ).pipe(
          tap(outcome => {
            if (outcome.kind !== 'confirmed') return;
            // Post-send refresh (D8 explicit trigger): the just-completed
            // ceremony left the account warm, so this requestSync pokes the host
            // engine (no prompt) to refresh state — the next getState poll then
            // reflects the sent tx. Fire-and-forget: the confirm result must not
            // wait on (nor fail from) the refresh.
            void requestMidnightSync({
              walletId: wallet.walletId,
              accountIndex,
              network: networkId,
            }).catch(() => undefined);
          }),
          map(outcome =>
            outcome.kind === 'confirmed'
              ? { serializedTx: outcome.txId, success: true as const }
              : confirmErrorFor(
                  outcome.kind === 'failed' ? outcome.reason : undefined,
                ),
          ),
        );
      }),
      catchError((error: Error) => {
        logger.error(error);
        return of(genericConfirmError());
      }),
    );
  };

const submitTx: TxExecutorImplementation<
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata
>['submitTx'] = ({ serializedTx }) =>
  // The host pipeline already submitted during confirm; `serializedTx` carries
  // the confirmed txId, so submit is a pass-through (matches the executor's
  // build → confirm → submit contract without a second submission).
  of({ success: true, txId: serializedTx });

export const makeTxExecutor = () =>
  (({ logger }) => ({
    blockchainName: 'Midnight',
    buildTx,
    previewTx,
    confirmTx: makeConfirmTx(logger),
    discardTx,
    submitTx,
  })) satisfies MakeTxExecutorImplementation<
    MidnightSpecificSendFlowData,
    MidnightSpecificTokenMetadata
  > as MakeTxExecutorImplementation;

export default makeTxExecutor;
