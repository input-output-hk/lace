import { Cardano } from '@cardano-sdk/core';
import { isNotNil } from '@cardano-sdk/util';
import { isCardanoAddress, UtxoCacheKey } from '@lace-contract/cardano-context';
import {
  combineLatest,
  defer,
  filter,
  map,
  switchMap,
  take,
  timeout,
} from 'rxjs';

import { uniqueRewardAccounts } from '../helpers';

import type { AccountResolution } from './scan-active-accounts';
import type { SideEffect } from '../..';
import type { CardanoAccount, SweepPlan } from '../helpers';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoNetworkId,
  CardanoPaymentAddress,
  CardanoProvider,
  CardanoRewardAccount,
  RequiredProtocolParameters,
} from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { Observable, ObservedValueOf } from 'rxjs';

type StateObservables = Parameters<SideEffect>[1];

// Source sync (UTxOs and addresses) is provider-bound. Beyond this we surface an error.
export const DISCOVERY_TIMEOUT_MS = 180_000;

// One signing identity in the swept set. A key agent is bound to one
// accountIndex, so the signer needs these raw props per account. Every other
// consumer reads the flat utxos/addresses union.
export type SigningAccount = {
  accountId: AccountId;
  accountIndex: number;
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

// The reviewed swept set, carried from discovery and replayed verbatim so the
// sweep spends exactly what the user reviewed, never re-scanning. Excludes the
// wallet (not serializable, re-read from the store for the signer). At sweep,
// only the reward withdrawal amount is refreshed (it must equal the exact
// on-chain balance), the UTxO set, addresses, and protocol params stay pinned.
export type ReviewedSweepPlan = {
  chainId: Cardano.ChainId;
  protocolParameters: RequiredProtocolParameters;
  utxos: Cardano.Utxo[];
  addresses: GroupedAddress[];
  signingAccounts: SigningAccount[];
};

// Flat across all swept accounts: utxos/addresses are the union (build, summary,
// fee, refusals), and the per-account signing identities sit alongside.
export type SourceContext = ReviewedSweepPlan & {
  wallet: AnyWallet;
};

// A UTxO is spendable once, so the same TxIn under two accounts means the scan
// mis-attributed an input. Building anyway would yield a tx that double-spends
// itself and can never settle, so fail loudly at the union instead.
const assertUniqueTxIns = (utxos: Cardano.Utxo[]): void => {
  const seen = new Set<string>();
  for (const [txIn] of utxos) {
    const key = `${txIn.txId}#${txIn.index}`;
    if (seen.has(key))
      throw new Error(`Duplicate TxIn in the merged sweep set: ${key}`);
    seen.add(key);
  }
};

/**
 * Merges the provider-scanned active accounts (1+) into the store-sourced
 * account-0 context, producing the flat all-accounts union the sweep operates
 * over. Every consumer downstream (build, fee, refusals, signer) reads the flat
 * lists. Only the signer partitions back by accountIndex.
 */
export const mergeAccountResolutions = (
  context: SourceContext,
  resolutions: readonly AccountResolution[],
): SourceContext => {
  const utxos = [...context.utxos, ...resolutions.flatMap(r => r.utxos)];
  assertUniqueTxIns(utxos);
  return {
    ...context,
    utxos,
    addresses: [...context.addresses, ...resolutions.flatMap(r => r.addresses)],
    signingAccounts: [
      ...context.signingAccounts,
      ...resolutions.map(
        ({ accountId, accountIndex, extendedAccountPublicKey }) => ({
          accountId,
          accountIndex,
          extendedAccountPublicKey,
        }),
      ),
    ],
  };
};

/**
 * Assembles the sweep plan from a resolved source context and destination.
 * Centralizes the networkMagic reach-through so discovery and the sweep build
 * the plan identically.
 */
export const assembleSweepPlan = (
  context: SourceContext,
  rewardInfos: SweepPlan['rewardInfos'],
  destinationAddress: CardanoPaymentAddress,
): SweepPlan => ({
  utxos: context.utxos,
  rewardInfos,
  protocolParameters: context.protocolParameters,
  networkMagic: context.chainId.networkMagic,
  destinationAddress,
});

/**
 * Resolves the source context for a sweep. Defaults to reading it from the
 * synced store (see {@link createSourceContext$}). Exposed as an injection
 * point, like buildTxFunction and signTxFunction, so a caller can supply the
 * context directly.
 */
export type SourceContextResolver = (
  ids: { sourceWalletId: WalletId; sourceAccountId: AccountId },
  stateObservables: StateObservables,
) => Observable<SourceContext>;

/**
 * Emits once the source account has synced far enough to sweep: its UTxOs and
 * addresses fetched into the store, and protocol parameters known. Account 0's
 * spendable set comes entirely from the synced store.
 */
export const createSourceContext$ = (
  {
    sourceWalletId,
    sourceAccountId,
  }: { sourceWalletId: WalletId; sourceAccountId: AccountId },
  {
    wallets: { selectWalletById$ },
    addresses: { selectByAccountId$ },
    cardanoContext: {
      selectAvailableAccountUtxos$,
      selectLastFetchedUtxoCacheKeyByAccount$,
      selectAllNetworkInfo$,
    },
  }: StateObservables,
): Observable<SourceContext> => {
  const walletAndAccount$ = selectWalletById$.pipe(
    map(selectWalletById => {
      const wallet = selectWalletById(sourceWalletId);
      const account = wallet?.accounts.find(
        a => a.accountId === sourceAccountId,
      ) as CardanoAccount | undefined;
      return wallet && account ? { wallet, account } : undefined;
    }),
    filter(isNotNil),
  );

  // Accepted only once the last UTxO fetch was filtered against the CURRENT
  // address set. A fetch racing address discovery legitimately drops every
  // UTxO on a not-yet-known address (the sync's franken filter), so a source
  // whose funds sit on a late-discovered address — e.g. a change address —
  // stores as empty and the planner would refuse a funded wallet. The cache
  // key carries the address count the fetch saw; the sync converges it to the
  // live count within a confirmation depth.
  const utxos$ = combineLatest([
    selectAvailableAccountUtxos$,
    selectLastFetchedUtxoCacheKeyByAccount$,
    selectByAccountId$,
  ]).pipe(
    filter(([, cacheKeys, selectByAccountId]) => {
      const cardanoAddressCount =
        selectByAccountId(sourceAccountId).filter(isCardanoAddress).length;
      return (
        cardanoAddressCount > 0 &&
        UtxoCacheKey.addressCount(cacheKeys[sourceAccountId]) ===
          cardanoAddressCount
      );
    }),
    map(([utxoMap]) => utxoMap[sourceAccountId]),
    filter(isNotNil),
  );

  const addresses$ = selectByAccountId$.pipe(
    map(selectByAccountId =>
      selectByAccountId(sourceAccountId)
        .filter(isCardanoAddress)
        .map(
          ({ address, data }): GroupedAddress => ({
            accountIndex: data!.accountIndex,
            address: Cardano.PaymentAddress(address),
            index: data!.index,
            networkId: data!.networkId,
            rewardAccount: Cardano.RewardAccount(data!.rewardAccount),
            type: data!.type,
            stakeKeyDerivationPath: data!.stakeKeyDerivationPath,
          }),
        ),
    ),
    filter(addresses => addresses.length > 0),
  );

  return walletAndAccount$.pipe(
    switchMap(({ wallet, account }) =>
      combineLatest([
        utxos$,
        addresses$,
        selectAllNetworkInfo$.pipe(
          map(
            networkInfos =>
              networkInfos[account.blockchainNetworkId as CardanoNetworkId]
                ?.protocolParameters,
          ),
          filter(isNotNil),
        ),
      ]).pipe(
        map(
          ([storeUtxos, baseAddresses, protocolParameters]): SourceContext => {
            const { accountIndex, chainId, extendedAccountPublicKey } =
              account.blockchainSpecific;
            return {
              wallet,
              chainId,
              protocolParameters,
              utxos: storeUtxos,
              addresses: baseAddresses,
              signingAccounts: [
                {
                  accountId: account.accountId,
                  accountIndex,
                  extendedAccountPublicKey,
                },
              ],
            };
          },
        ),
      ),
    ),
    take(1),
    timeout(DISCOVERY_TIMEOUT_MS),
  );
};

/**
 * Resolves the source context for the SWEEP by replaying the reviewed plan from
 * discovery (see {@link createSourceContext$}), rather than re-resolving. The
 * sweep must spend exactly the reviewed accounts: re-scanning could diverge, and
 * a fresh account-0 resolve would drop the scanned accounts 1+ entirely. The
 * wallet is re-read from the store (it is not carried in the plan, it holds the
 * encrypted root and is not serializable).
 */
export const readReviewedSweepPlan$: SourceContextResolver = (
  { sourceWalletId },
  {
    migrateWallet: { selectReviewedSweepPlan$ },
    wallets: { selectWalletById$ },
  },
) =>
  combineLatest([
    selectReviewedSweepPlan$.pipe(filter(isNotNil)),
    selectWalletById$.pipe(
      map(selectWalletById => selectWalletById(sourceWalletId)),
      filter(isNotNil),
    ),
  ]).pipe(
    map(([plan, wallet]) => ({ ...plan, wallet })),
    take(1),
    timeout(DISCOVERY_TIMEOUT_MS),
  );

const txInKey = (txIn: Cardano.TxIn): string => `${txIn.txId}#${txIn.index}`;

/**
 * Errors must propagate — swallowing them as [] would make the resume
 * intersection empty, triggering the empty-UTxO success shortcut and marking
 * the sweep done while funds remain on the source.
 */
const unwrapAccountUtxos = (
  result: ObservedValueOf<ReturnType<CardanoProvider['getAccountUtxos']>>,
): Cardano.Utxo[] => {
  if (result.isErr()) throw result.unwrapErr();
  return result.unwrap();
};

/** Intersect: only keep live UTxOs that were in the pinned, reviewed set. */
const intersectPinnedUtxos = (
  utxoSets: readonly Cardano.Utxo[][],
  pinnedTxIns: ReadonlySet<string>,
): Cardano.Utxo[] =>
  utxoSets.flat().filter(([txIn]) => pinnedTxIns.has(txInKey(txIn)));

/**
 * Resolves the source context for a RESUME after a partial sweep (FR-6). Reads
 * the reviewed plan from state (the original pinned accounts), fetches current
 * UTxOs from the provider for each reviewed account, and intersects them with
 * the original pinned UTxO set. This ensures:
 *  - We never sweep UTxOs the user didn't review.
 *  - Already-spent inputs (successfully swept chunks) are naturally excluded.
 */
export const resolveResumeContext$ =
  (cardanoProvider: CardanoProvider): SourceContextResolver =>
  (
    { sourceWalletId },
    {
      migrateWallet: { selectReviewedSweepPlan$ },
      wallets: { selectWalletById$ },
    },
  ) =>
    combineLatest([
      selectReviewedSweepPlan$.pipe(filter(isNotNil)),
      selectWalletById$.pipe(
        map(selectWalletById => selectWalletById(sourceWalletId)),
        filter(isNotNil),
      ),
    ]).pipe(
      switchMap(([plan, wallet]) => {
        const pinnedTxIns = new Set(plan.utxos.map(([txIn]) => txInKey(txIn)));
        const rewardAccounts = uniqueRewardAccounts(plan.addresses);

        // Fetch current UTxOs for each reward account from the provider.
        const fetchUtxos$ = (rewardAccount: CardanoRewardAccount) =>
          cardanoProvider
            .getAccountUtxos({ rewardAccount }, { chainId: plan.chainId })
            .pipe(map(unwrapAccountUtxos));

        return defer(() => combineLatest(rewardAccounts.map(fetchUtxos$))).pipe(
          map(
            (utxoSets): SourceContext => ({
              ...plan,
              wallet,
              utxos: intersectPinnedUtxos(utxoSets, pinnedTxIns),
            }),
          ),
        );
      }),
      take(1),
      timeout(DISCOVERY_TIMEOUT_MS),
    );
