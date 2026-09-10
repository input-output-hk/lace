import { Timestamp } from '@lace-lib/util';
import { EMPTY, merge, mergeMap, of, withLatestFrom } from 'rxjs';

import { isMigratableRow } from '../slice';

import type { SideEffect } from '../..';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

/** The Cardano BIP-32 account index, when the account carries one. */
const cardanoAccountIndex = (account: AnyAccount): number | undefined =>
  account.blockchainName === 'Cardano'
    ? (account.blockchainSpecific as { accountIndex?: number } | undefined)
        ?.accountIndex
    : undefined;

/**
 * The one dispatch shape both triggers share: stamp `migratedOutAt` on the
 * given unstamped accounts (and optionally the wallet). Returns undefined
 * when nothing would change, so no-op sweeps dispatch nothing.
 */
const stampUpdate = ({
  wallet,
  stampIds,
  stampWallet,
}: {
  wallet: AnyWallet;
  stampIds: ReadonlySet<string>;
  stampWallet: boolean;
}) => {
  const accountStamps = wallet.accounts.filter(
    account =>
      stampIds.has(account.accountId) &&
      account.metadata.migratedOutAt === undefined,
  );
  const shouldStampWallet =
    stampWallet && wallet.metadata.migratedOutAt === undefined;
  if (accountStamps.length === 0 && !shouldStampWallet) return undefined;

  const migratedOutAt = Timestamp(Date.now());
  return {
    accounts: wallet.accounts.map(account =>
      stampIds.has(account.accountId) &&
      account.metadata.migratedOutAt === undefined
        ? { ...account, metadata: { ...account.metadata, migratedOutAt } }
        : account,
    ),
    ...(shouldStampWallet && {
      metadata: { ...wallet.metadata, migratedOutAt },
    }),
  } as Partial<AnyWallet>;
};

/**
 * Stamp the source wallet and its swept accounts as migrated-out, so the old
 * surfaces stop reading as a wallet the user should keep transacting from.
 *
 * The stamp is a machine-readable timestamp on the repo metadata, NOT a
 * rename: UI surfaces render a localized "[Migrated]" tag from it at read
 * time, so the warning follows the active locale instead of freezing into
 * the stored name, and the user's own names stay untouched.
 *
 * Two triggers:
 * - Each submitted CHUNK stamps its own source account the moment that
 *   account's funds move — a preserve sweep that pauses mid-plan and is never
 *   resumed still leaves the already-emptied accounts marked.
 * - Sweep COMPLETION stamps the remaining swept set, and the WALLET when
 *   every loaded account on the migrated network tier is settled: swept now,
 *   stamped by an earlier migration, or a Cardano account WITHIN the scan
 *   horizon that the plan omitted for holding nothing sweepable (consolidate
 *   only — preserve deliberately refuses accounts whose funds stay). An
 *   account past the horizon was never scanned, and another blockchain's
 *   account was never in reach, so either blocks the wallet-level stamp.
 *
 * The swept set is the reviewed plan's signing accounts, intersected in
 * preserve mode with the mapping's migratable rows (rewards-only accounts
 * keep their rewards withdrawable on the source and must not read as
 * migrated). Idempotent: an existing stamp is kept — the FIRST migration's
 * time is the fact worth preserving — and a no-op dispatches nothing.
 */
export const makeMarkSourceMigrated =
  (): SideEffect =>
  (
    { migrateWallet: { sweepSucceeded$, sweepChunkSubmitted$ } },
    {
      migrateWallet: {
        selectSourceWalletId$,
        selectReviewedSweepPlan$,
        selectMigrationMode$,
        selectAccountMapping$,
        selectSourceNetworkType$,
        selectDiscovery$,
      },
      wallets: { selectWalletById$ },
    },
    { actions },
  ) => {
    const chunkStamp$ = sweepChunkSubmitted$.pipe(
      withLatestFrom(
        selectSourceWalletId$,
        selectReviewedSweepPlan$,
        selectWalletById$,
      ),
      mergeMap(([{ payload }, sourceWalletId, plan, selectWalletById]) => {
        if (
          !sourceWalletId ||
          !plan ||
          payload.sourceAccountIndex === undefined
        )
          return EMPTY;
        const wallet = selectWalletById(sourceWalletId);
        if (!wallet) return EMPTY;
        const chunkAccountId = plan.signingAccounts.find(
          ({ accountIndex }) => accountIndex === payload.sourceAccountIndex,
        )?.accountId;
        if (chunkAccountId === undefined) return EMPTY;
        const changes = stampUpdate({
          wallet,
          stampIds: new Set([chunkAccountId]),
          stampWallet: false,
        });
        return changes
          ? of(actions.wallets.updateWallet({ id: sourceWalletId, changes }))
          : EMPTY;
      }),
    );

    const completionStamp$ = sweepSucceeded$.pipe(
      withLatestFrom(
        selectSourceWalletId$,
        selectReviewedSweepPlan$,
        selectMigrationMode$,
        selectAccountMapping$,
        selectSourceNetworkType$,
        selectDiscovery$,
        selectWalletById$,
      ),
      mergeMap(
        ([
          ,
          sourceWalletId,
          plan,
          mode,
          mapping,
          networkType,
          discovery,
          selectWalletById,
        ]) => {
          if (!sourceWalletId || !plan) return EMPTY;
          const wallet = selectWalletById(sourceWalletId);
          if (!wallet) return EMPTY;

          const migratedIndexes =
            mode === 'preserve' && mapping
              ? new Set(
                  mapping
                    .filter(isMigratableRow)
                    .map(({ sourceAccountIndex }) => sourceAccountIndex),
                )
              : undefined;
          const swept = new Set(
            plan.signingAccounts
              .filter(
                ({ accountIndex }) =>
                  migratedIndexes === undefined ||
                  migratedIndexes.has(accountIndex),
              )
              .map(({ accountId }) => accountId),
          );
          const sweptTierAccounts = networkType
            ? wallet.accounts.filter(
                account => account.networkType === networkType,
              )
            : wallet.accounts;
          const scannedThrough = discovery?.scannedThroughAccountIndex;
          // A tier account no longer standing in the way of the wallet-level
          // stamp — see the settling rules in the doc comment above.
          const settled = (account: AnyAccount): boolean => {
            if (swept.has(account.accountId)) return true;
            if (account.metadata.migratedOutAt !== undefined) return true;
            if (mode === 'preserve') return false;
            const accountIndex = cardanoAccountIndex(account);
            return (
              accountIndex !== undefined &&
              scannedThrough !== undefined &&
              accountIndex <= scannedThrough
            );
          };
          const changes = stampUpdate({
            wallet,
            stampIds: swept,
            stampWallet:
              sweptTierAccounts.length > 0 && sweptTierAccounts.every(settled),
          });
          return changes
            ? of(actions.wallets.updateWallet({ id: sourceWalletId, changes }))
            : EMPTY;
        },
      ),
    );

    return merge(chunkStamp$, completionStamp$);
  };
