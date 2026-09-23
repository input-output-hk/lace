import { Cardano } from '@cardano-sdk/core';
import {
  CardanoRewardAccount,
  InputSelectionError,
  LOVELACE_TOKEN_ID,
  createInputResolver,
  filterSpendableUtxos,
} from '@lace-contract/cardano-context';
import {
  CardanoDustNetwork,
  MidnightCoinPubkey,
  getCnightAssetId,
  getDustGeneratorPaymentAddress,
  getDustGeneratorRewardAccount,
  getDustMappingNftAssetId,
  type CardanoStakeKeyHash,
  type NightDesignationAction as NightDesignationActionInput,
} from '@lace-lib/cnight-dust-designation';
import { BigNumber } from '@lace-lib/util';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { firstValueFrom, from, map, of, switchMap, take, timeout } from 'rxjs';

import { hexToBytes, resolveAccountKeyHashes } from './account-key-hashes';
import { buildNightDesignationTx } from './build-night-designation-tx';
import { createProviderExUnitsEvaluator } from './provider-ex-units-evaluator';
import { findRegistrationUtxo } from './registration-utxo';
import { unwrapProviderResult } from './unwrap-provider-result';

import type { SideEffect } from '../..';
import type {
  Activity,
  BlockchainSpecificActivityMetadata,
} from '@lace-contract/activities';
import type {
  CardanoPaymentAddress,
  NightDesignationBuildResult,
  NightDesignationStateBuilding,
} from '@lace-contract/cardano-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type { TxErrorTranslationKeys } from '@lace-contract/tx-executor';

// =====================================================================
// cNIGHT designation — build orchestrator.
// =====================================================================
// Drives the `Building` state: assembles the account context + Cardano
// network data, scans the script address for the account's registration UTxO
// (matching the account's stake key) — which update/deregister spend and
// designate must find ABSENT — reads the script reward account so an update's
// withdrawal matches what the ledger will let the tx take, runs
// `buildNightDesignationTx` against the SDK tx-builder, and reports the
// unsigned CBOR (or a typed error) via `buildCompleted`.
//
// The scan is the primary pre-signing gate, and the only one a headless SDK
// caller meets. It reads CONFIRMED UTxOs; the pending-activity gate below
// covers the in-app window, but its row is written by the confirm/submit half
// that only `init-full.ts` composes — so an SDK caller submitting its own CBOR,
// and any path where a designation lands during review, stay blind.
//
// `switchMap`, not `exhaustMap`: `firstStateOfStatus` already collapses
// consecutive `Building` states, so a second trigger means the flow was reset
// and re-requested — often for a DIFFERENT account. Dropping it (exhaustMap)
// would let the stale CBOR resolve into the new `Building`, raising a signing
// prompt for one account's UTxOs under another's. `buildCompleted` carries the
// account it was built for so the reducer can discard a superseded result.
//
// All IO goes through injected dependencies (ADR 19) so it marble-tests.
// =====================================================================

// Added to the tip SLOT (1 slot = 1s on Cardano), so this is a ~2h TTL buffer.
export const TTL_BUFFER_SLOTS = 7200;

// Nothing clears a pending row for a tx that never lands — no reaper, no TTL
// sweep, no Cardano `Failed` transition — so without a cut-off this gate would
// refuse the account forever. Removable once pending rows expire platform-side.
const PENDING_INDEXING_SLACK_MS = 600_000;
export const LIVE_PENDING_WINDOW_MS =
  TTL_BUFFER_SLOTS * 1000 + PENDING_INDEXING_SLACK_MS;

// A deadline on the pendings read, so a slow or silent state stream degrades to
// "no pendings" instead of parking the sheet in `Building`.
const PENDING_READ_TIMEOUT_MS = 2000;

const NO_PENDING_ACTIVITIES: Activity[] = [];

/**
 * Only `designate` counts: an update/deregister with no confirmed marker
 * already fails `no-registration-utxo`, and with one the scan already refuses
 * a designate — so widening this over-blocks for no safety gain.
 */
const hasLivePendingDesignate = (
  pendingActivities: readonly Activity[],
): boolean =>
  pendingActivities.some(activity => {
    const blockchainSpecific = activity.blockchainSpecific as
      | BlockchainSpecificActivityMetadata
      | undefined;
    if (blockchainSpecific?.Cardano?.nightDesignation?.action !== 'designate')
      return false;
    return Date.now() - activity.timestamp < LIVE_PENDING_WINDOW_MS;
  });

// Map the typed build-failure codes to distinct, actionable copy; everything
// else (provider/network failures, missing chain id) falls back to the generic
// message. The user-facing codes come from the blueprint + resolveAction.
const BUILD_ERROR_KEYS_BY_CODE: Record<string, TxErrorTranslationKeys> = {
  'already-registered': {
    title: 'v2.cnight-designation.build.error.already-registered.title',
    subtitle: 'v2.cnight-designation.build.error.already-registered.subtitle',
  },
  'no-cnight': {
    title: 'v2.cnight-designation.build.error.no-cnight.title',
    subtitle: 'v2.cnight-designation.build.error.no-cnight.subtitle',
  },
  'no-cardano-utxos': {
    title: 'v2.cnight-designation.build.error.no-cardano-utxos.title',
    subtitle: 'v2.cnight-designation.build.error.no-cardano-utxos.subtitle',
  },
  'no-registration-utxo': {
    title: 'v2.cnight-designation.build.error.no-registration-utxo.title',
    subtitle: 'v2.cnight-designation.build.error.no-registration-utxo.subtitle',
  },
  'script-stake-unregistered': {
    title: 'v2.cnight-designation.build.error.script-stake-unregistered.title',
    subtitle:
      'v2.cnight-designation.build.error.script-stake-unregistered.subtitle',
  },
};

const GENERIC_BUILD_ERROR_KEYS: TxErrorTranslationKeys = {
  title: 'v2.cnight-designation.build.error.title',
  subtitle: 'v2.cnight-designation.build.error.subtitle',
};

const errorTranslationKeysForCode = (
  code: string | undefined,
): TxErrorTranslationKeys =>
  (code ? BUILD_ERROR_KEYS_BY_CODE[code] : undefined) ??
  GENERIC_BUILD_ERROR_KEYS;

const failure = (error: Error, code?: string): NightDesignationBuildResult => ({
  success: false,
  error: { name: error.name, message: error.message },
  errorTranslationKeys: errorTranslationKeysForCode(code),
});

/**
 * Resolve the rich cNIGHT action from the serializable `Building` state by
 * scanning the script address for the registration UTxO whose inline datum is
 * bound to the account's stake key. Every action needs that answer, not just
 * update/deregister: Midnight honours neither of two registrations and the
 * second revokes the first, so a designate over an existing one is refused
 * here (`already-registered`) rather than signed. For update it also reads the
 * script reward account so the withdrawal entry matches the amount the ledger
 * will actually let the tx take.
 */
const resolveAction = async ({
  state,
  network,
  stakeKeyHash,
  dependencies,
  chainId,
  pendingActivities,
}: {
  state: NightDesignationStateBuilding;
  network: CardanoDustNetwork;
  stakeKeyHash: CardanoStakeKeyHash;
  dependencies: SideEffectDependencies;
  chainId: Cardano.ChainId;
  pendingActivities: readonly Activity[];
}): Promise<NightDesignationActionInput> => {
  const dustPubkey =
    state.dustPubkeyHex === undefined
      ? undefined
      : MidnightCoinPubkey(hexToBytes(state.dustPubkeyHex));

  const scriptAddress = getDustGeneratorPaymentAddress(
    network,
  ) as unknown as CardanoPaymentAddress;
  const scriptUtxos = await firstValueFrom(
    unwrapProviderResult(() =>
      dependencies.cardanoProvider.getUtxosAtAddress(
        { address: scriptAddress },
        { chainId },
      ),
    ),
  );
  const registration = findRegistrationUtxo(
    scriptUtxos,
    getDustMappingNftAssetId(network),
    stakeKeyHash,
  );

  if (state.action === 'designate') {
    if (registration) {
      throw Object.assign(
        new Error('This account already has a cNIGHT designation'),
        { code: 'already-registered' as const },
      );
    }
    // After the scan, not before: a scan failure must reach the outer catch
    // rather than be masked by this local gate.
    if (hasLivePendingDesignate(pendingActivities)) {
      throw Object.assign(
        new Error('A cNIGHT designation for this account is still confirming'),
        { code: 'already-registered' as const },
      );
    }
    if (!dustPubkey) throw new Error('Missing dust pubkey for designate');
    return { kind: 'register', dustPubkey };
  }

  if (!registration) {
    throw Object.assign(
      new Error('No cNIGHT designation registration found for this account'),
      { code: 'no-registration-utxo' as const },
    );
  }

  if (state.action === 'deregister') {
    return { kind: 'deregister', registrationUtxo: registration.utxo };
  }
  if (!dustPubkey) throw new Error('Missing dust pubkey for update');

  // The update path re-authorises the script through a zero-or-more withdrawal
  // from the validator's own reward account. The amount is chain state, so it
  // is read here rather than carried in the request: a stale figure makes the
  // ledger reject the tx with `WithdrawalsNotInRewardsCERTS`, and a guest UI
  // has no way to query it. An unregistered reward account cannot be withdrawn
  // from at all, so that is a coded failure rather than a zero withdrawal.
  const scriptRewardAccountInfo = await firstValueFrom(
    unwrapProviderResult(() =>
      dependencies.cardanoProvider.getRewardAccountInfo(
        {
          rewardAccount: CardanoRewardAccount(
            getDustGeneratorRewardAccount(network) as unknown as string,
          ),
        },
        { chainId },
      ),
    ),
  );
  if (!scriptRewardAccountInfo.isRegistered) {
    throw Object.assign(
      new Error(
        "The cNIGHT validator's reward account is not registered on this network",
      ),
      { code: 'script-stake-unregistered' as const },
    );
  }

  return {
    kind: 'update',
    dustPubkey,
    registrationUtxo: registration.utxo,
    scriptWithdrawableLovelace: BigNumber.valueOf(
      scriptRewardAccountInfo.withdrawableAmount,
    ),
  };
};

const buildDesignation = async (
  state: NightDesignationStateBuilding,
  dependencies: SideEffectDependencies,
  pendingActivities: readonly Activity[],
): Promise<NightDesignationBuildResult> => {
  try {
    const { accountId } = state;
    const cardano = dependencies.txExecutorCardano;

    const [chainId, allAccountUtxos, unspendableUtxos, cardanoAddresses] =
      await Promise.all([
        firstValueFrom(cardano.cardanoChainId$),
        firstValueFrom(cardano.cardanoAccountUtxos$),
        firstValueFrom(cardano.cardanoAccountUnspendableUtxos$),
        firstValueFrom(cardano.cardanoAddresses$),
      ]);

    if (!chainId) throw new Error('Cardano chain id not available');

    // FULL protocol parameters (incl. V3 cost models) — not the cached
    // RequiredProtocolParameters pick on cardanoProtocolParameters$.
    const [protocolParameters, tip] = await Promise.all([
      firstValueFrom(
        unwrapProviderResult(() =>
          dependencies.cardanoProvider.getProtocolParameters({ chainId }),
        ),
      ),
      firstValueFrom(
        unwrapProviderResult(() =>
          dependencies.cardanoProvider.getTip({ chainId }),
        ),
      ),
    ]);

    const network = CardanoDustNetwork.fromNetworkMagic(chainId.networkMagic);

    const { primaryAddress, paymentKeyHash, stakeKeyHash } =
      resolveAccountKeyHashes(cardanoAddresses, accountId);

    const spendable = filterSpendableUtxos(
      allAccountUtxos[accountId] ?? [],
      unspendableUtxos[accountId] ?? [],
    );
    const cnightAssetId = getCnightAssetId(network);
    const cnightUtxos = spendable.filter(([, out]) =>
      out.value.assets?.has(cnightAssetId),
    );
    // ADA cover + collateral pool: spendable, non-cNIGHT UTxOs.
    const coverUtxos = spendable.filter(
      ([, out]) => !out.value.assets?.has(cnightAssetId),
    );

    const action = await resolveAction({
      state,
      network,
      stakeKeyHash,
      dependencies,
      chainId,
      pendingActivities,
    });

    // No ADA-only UTxO to fund the fee + collateral (e.g. every spendable
    // UTxO holds cNIGHT) → surface the actionable "not enough ADA" copy
    // instead of a generic balancing failure deep in the SDK builder. Checked
    // AFTER resolveAction so an already-designated account hears that — a
    // permanent state — rather than a shortfall it could fund away.
    if (coverUtxos.length === 0) {
      return failure(
        new Error('No ADA-only UTxO available to cover fee and collateral'),
        'no-cardano-utxos',
      );
    }

    const result = await buildNightDesignationTx(
      {
        network,
        action,
        cnightUtxos,
        paymentKeyHash,
        stakeKeyHash,
        changeAddress: primaryAddress,
        ttlSlot: Cardano.Slot(Number(tip.slot) + TTL_BUFFER_SLOTS),
        protocolParameters,
      },
      {
        networkMagic: chainId.networkMagic as Cardano.NetworkMagics,
        coverUtxos,
        txEvaluator: createProviderExUnitsEvaluator({
          cardanoProvider: dependencies.cardanoProvider,
          chainId,
          logger: dependencies.logger,
        }),
        inputResolver: createInputResolver([
          ...cnightUtxos,
          ...coverUtxos,
          ...(action.kind === 'register' ? [] : [action.registrationUtxo]),
        ]),
      },
    );

    if (!result.ok)
      return failure(new Error(result.error.message), result.error.code);
    return {
      success: true,
      serializedTx: result.value.cbor,
      fees: [
        { tokenId: LOVELACE_TOKEN_ID, amount: BigNumber(result.value.fee) },
      ],
    };
  } catch (error) {
    // A coin-selection failure (InputSelectionError) means the account can't
    // fund fee + collateral + the re-created output's min-utxo — surface the
    // actionable "not enough ADA" copy, not the generic error.
    // InsufficientCollateral stays generic (see buildNightDesignationTx).
    const code =
      error instanceof InputSelectionError
        ? 'no-cardano-utxos'
        : (error as { code?: string }).code;
    return failure(
      error instanceof Error ? error : new Error(String(error)),
      code,
    );
  }
};

export const makeNightDesignationBuilding =
  (): SideEffect => (_, stateObservables, dependencies) =>
    firstStateOfStatus(
      stateObservables.nightDesignationFlow.selectState$,
      'Building',
    ).pipe(
      switchMap(state =>
        // Read per trigger, never `withLatestFrom`: `firstStateOfStatus` does
        // not replay, so an unemitted stream would drop the trigger and park
        // the sheet in Building with no error and no Retry. The bound is a
        // deadline, not a race — a late emission still wins the gate.
        stateObservables.activities.selectPendingActivitiesByAccount$.pipe(
          map(byAccount => byAccount[state.accountId] ?? NO_PENDING_ACTIVITIES),
          take(1),
          timeout({
            first: PENDING_READ_TIMEOUT_MS,
            with: () => of(NO_PENDING_ACTIVITIES),
          }),
          switchMap(pendingActivities =>
            from(buildDesignation(state, dependencies, pendingActivities)).pipe(
              map(result =>
                dependencies.actions.nightDesignationFlow.buildCompleted({
                  accountId: state.accountId,
                  result,
                }),
              ),
            ),
          ),
        ),
      ),
    );
