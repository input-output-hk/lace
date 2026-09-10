import { CardanoNetworkId } from '@lace-contract/cardano-context';
import {
  catchError,
  defer,
  exhaustMap,
  from,
  map,
  of,
  withLatestFrom,
} from 'rxjs';

import { consolidateLandingRow } from '../helpers/consolidate-landing-row';
import { plannedDestinationIndexes } from '../helpers/planned-destination-indexes';
import { isMigratableRow } from '../slice';

import { resolveUnusedDestinationIndexes } from './destination-freshness';
import { makeDeviceAccountSource } from './device-account-source';
import { asDeviceFailure, deviceHintKey } from './device-hint';
import { failure } from './failure';

import type { SideEffect } from '../..';
import type { AccountMapping, MigrationMode } from '../slice';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { AnyWallet } from '@lace-contract/wallet-repo';

/**
 * The plan with the probed indexes written onto the rows the sweep will pay, so
 * the review names accounts that were actually checked against the chain.
 *
 * `resolved` is one index per planned index, in plan order, so the pairing is
 * positional — and which rows it pairs with depends on the mode. Preserve pays
 * every funded row its own landing account. Consolidate pays one row, the
 * landing row: rewriting a row the sweep ignores left the review naming a
 * probed account while the funds went to an unprobed one.
 */
const withProbedIndexes = ({
  accountMapping,
  landing,
  migrationMode,
  resolved,
}: {
  accountMapping: AccountMapping | undefined;
  landing: ReturnType<typeof consolidateLandingRow>;
  migrationMode: MigrationMode | undefined;
  resolved: number[];
}): AccountMapping | undefined => {
  const fundedRows = accountMapping?.filter(isMigratableRow) ?? [];
  const isPayingEveryFundedRow =
    migrationMode === 'preserve' && resolved.length === fundedRows.length;

  if (isPayingEveryFundedRow)
    return accountMapping?.map(row => {
      const position = fundedRows.indexOf(row);
      return position === -1
        ? row
        : { ...row, destinationAccountIndex: resolved[position] };
    });

  return accountMapping?.map((row, index) =>
    index === landing?.position && resolved[0] !== undefined
      ? { ...row, destinationAccountIndex: resolved[0] }
      : row,
  );
};

/**
 * Resolves which accounts a HARDWARE destination's funds will land in, before
 * the review states them.
 *
 * `freshDestinationMapping$` cannot do this at discovery: it derives candidate
 * keys from the destination's encrypted root, and a hardware wallet has none.
 * So a hardware destination reached the review with indexes that were arithmetic
 * — "past the highest loaded" — and nothing had asked the chain whether they
 * were used. The sweep probed later and could land the funds on different
 * indexes than the review named, which is the promise the review exists to make.
 *
 * Runs here because the device is now connected before the review, which is the
 * first moment its account keys are available. Whatever it costs the user — a
 * round-trip per index, plus a confirmation each on a device in expert mode —
 * lands while they can still abandon for free; after the review they cannot.
 */
export const makeResolveDestinationTargets =
  (): SideEffect => (actionObservables, stateObservables, dependencies) => {
    const {
      migrateWallet: { destinationDeviceConnected$ },
    } = actionObservables;
    const {
      migrateWallet: {
        selectAccountMapping$,
        selectDestinationWalletId$,
        selectDestinationAccountId$,
        selectMigrationMode$,
      },
      wallets: { selectAll$ },
    } = stateObservables;

    return destinationDeviceConnected$.pipe(
      withLatestFrom(
        selectAccountMapping$,
        selectDestinationWalletId$,
        selectDestinationAccountId$,
        selectMigrationMode$,
        selectAll$,
      ),
      exhaustMap(
        ([
          action,
          accountMapping,
          destinationWalletId,
          destinationAccountId,
          migrationMode,
          allWallets,
        ]) => {
          const device = action.payload.device;
          const destinationWallet = (allWallets as AnyWallet[]).find(
            wallet => wallet.walletId === destinationWalletId,
          );
          const networkId = destinationWallet?.accounts.find(
            account => account.accountId === destinationAccountId,
          )?.blockchainNetworkId;
          const chainId = CardanoNetworkId.getChainId(
            networkId as Parameters<typeof CardanoNetworkId.getChainId>[0],
          );
          // Which row consolidate lands in, so the probe checks the account
          // the sweep will actually pay — both read it from one helper.
          const landing =
            accountMapping === undefined
              ? undefined
              : consolidateLandingRow(accountMapping);
          const planned = plannedDestinationIndexes({
            accountMapping,
            migrationMode,
          });

          if (!destinationWallet || !chainId || planned.length === 0) {
            // Nothing to check — proceed rather than strand the wizard on a
            // screen whose only job was to collect a device it already has.
            return of(
              dependencies.actions.migrateWallet.destinationTargetsResolved({
                resolvedDestinationIndexes: planned,
              }),
            );
          }

          const cardanoAccounts = destinationWallet.accounts.filter(
            account =>
              account.blockchainName === 'Cardano' &&
              account.blockchainNetworkId === networkId,
          );
          const existingIndexes = cardanoAccounts.map(
            account =>
              (account.blockchainSpecific as { accountIndex?: number })
                ?.accountIndex ?? 0,
          );
          // Keys the wallet already holds, so probing a loaded account needs no
          // export at all — the difference between reusing an untouched account
          // and going back to the device for a key we already have.
          const xpubByIndex = new Map(
            cardanoAccounts.flatMap(account => {
              const xpub = (
                account.blockchainSpecific as {
                  extendedAccountPublicKey?: Bip32PublicKeyHex;
                }
              )?.extendedAccountPublicKey;
              const index =
                (account.blockchainSpecific as { accountIndex?: number })
                  ?.accountIndex ?? 0;
              return xpub ? [[index, xpub] as const] : [];
            }),
          );

          return from(
            defer(async () => {
              const source = await makeDeviceAccountSource(
                {
                  wallet: destinationWallet,
                  hwSource: device,
                  targetNetworkId: networkId as never,
                },
                dependencies,
              );
              if (!source) {
                throw new Error(
                  'Destination device cannot export account keys for this family',
                );
              }
              return resolveUnusedDestinationIndexes(
                {
                  // From the wallet's FIRST account, not past its last: a loaded
                  // account that has never transacted is the target we want.
                  startIndex: Math.min(...existingIndexes, ...planned),
                  count: planned.length,
                  chainId,
                  // Wrapped here, not in the factory: even a failure the
                  // classifier cannot name returns to THIS screen, whose job
                  // is to connect a device.
                  xpubForIndex: async index =>
                    source.xpubForIndex(index).catch((error: unknown) => {
                      throw asDeviceFailure(error);
                    }),
                  xpubByIndex,
                },
                dependencies,
              );
            }),
          ).pipe(
            map(resolved => {
              const rewritten = withProbedIndexes({
                accountMapping,
                landing,
                migrationMode,
                resolved,
              });
              return dependencies.actions.migrateWallet.destinationTargetsResolved(
                {
                  accountMapping: rewritten,
                  resolvedDestinationIndexes: resolved,
                },
              );
            }),
            // A device problem goes back to the connect screen naming it:
            // nothing has moved, and the fix is on the user's desk. Anything
            // else really did fail the step — told apart by identity, since
            // only the device call site can tag one (see `asDeviceFailure`).
            catchError((error: unknown) => {
              const hint = deviceHintKey(error);
              if (hint === undefined)
                return failure(
                  dependencies,
                  'migrate-wallet.error.destination-check-failed',
                  error,
                );
              dependencies.logger.warn(
                '[migrate-wallet] destination device failed the probe',
                { hint, error },
              );
              return of(
                dependencies.actions.migrateWallet.destinationDeviceFailed({
                  deviceHintKey: hint,
                }),
              );
            }),
          );
        },
      ),
    );
  };
