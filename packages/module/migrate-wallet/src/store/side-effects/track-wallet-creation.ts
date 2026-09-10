import { isNotNil } from '@cardano-sdk/util';
import { isHardwareErrorCategory } from '@lace-lib/util-hw';
import {
  catchError,
  combineLatest,
  concat,
  EMPTY,
  filter,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  take,
  takeUntil,
  timeout,
  timer,
  withLatestFrom,
} from 'rxjs';

import { findCardanoAccount } from '../helpers';

import { failure } from './failure';

import type { SideEffect } from '../..';
import type {
  AccountId,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';

const findWalletWithNewAccount = (
  wallets: AnyWallet[],
  existingAccountIds: Set<AccountId>,
): AnyWallet | undefined =>
  wallets.find(wallet =>
    wallet.accounts.some(account => !existingAccountIds.has(account.accountId)),
  );

/**
 * Tracks wallet creations by different signals, because they use different
 * paths (a consequence of app-lock being first-run-only):
 *
 * - Fresh destination (onboarding): created via
 *   `onboardingV2.attemptCreateWallet` as the FIRST wallet, which sets up
 *   the app-lock. Detected via `createWalletSuccess` while
 *   `creatingDestination`.
 * - Fresh destination (settings): created via
 *   `accountManagement.attemptCreateWallet`, which emits no
 *   `createWalletSuccess`. Detected by watching the repo for a new wallet
 *   appearing after `destinationCreationStarted` when wallets already exist.
 * - HW destination (onboarding): created via
 *   `onboardingV2.attemptCreateHardwareWallet`, also detected via
 *   `createWalletSuccess`.
 * - HW destination (settings): created via
 *   `accountManagement.attemptCreateHardwareWallet`, which emits no
 *   `createWalletSuccess`. Detected by watching the repo for new accounts
 *   appearing after `hwDeviceConnected`. Account-management dispatches
 *   `addWallet` for a first-time device or `updateWallet` when reconnecting
 *   a device that already has a wallet entry, so we watch accountIds (not
 *   walletIds) to handle both cases.
 * - Source: imported via `accountManagement.attemptCreateWallet` as a SECOND
 *   wallet, which reuses the existing app-lock (no re-setup) and emits no
 *   `createWalletSuccess`. Detected by watching the repo for a new wallet
 *   appearing after `sourceImportStarted`.
 */
/**
 * Device states the user resolves in hand — unlocking, opening the app —
 * during which the source import waits and re-attempts rather than failing.
 */
const SELF_RESOLVING_DEVICE_STATES: ReadonlySet<string> = new Set([
  'device-locked',
  'app-not-open',
]);
/** Poll cadence while waiting on a self-resolving device state. */
const DEVICE_RETRY_DELAY_MS = 3000;

export const makeTrackWalletCreation =
  (): SideEffect =>
  (
    {
      onboardingV2: { createWalletSuccess$, createWalletFailure$ },
      migrateWallet: {
        destinationCreationStarted$,
        sourceImportStarted$,
        hwDeviceConnected$,
        wizardCancelled$,
      },
      accountManagement: { hardwareWalletCreationFailed$ },
    },
    {
      migrateWallet: { selectPendingHwSource$, selectStep$ },
      wallets: { selectWalletById$, selectAll$ },
      cardanoContext: { selectBlockchainNetworkId$ },
    },
    dependencies,
  ) => {
    const cardanoAccount$ = (walletId: WalletId) =>
      combineLatest([selectWalletById$, selectBlockchainNetworkId$]).pipe(
        map(([selectWalletById, networkId]) =>
          findCardanoAccount(selectWalletById(walletId), networkId),
        ),
        filter(isNotNil),
        take(1),
        timeout(15_000),
      );

    // Fresh + HW-onboarding destinations both emit createWalletSuccess.
    const destination$ = createWalletSuccess$.pipe(
      withLatestFrom(selectStep$),
      filter(([, step]) => step === 'creatingDestination'),
      mergeMap(([{ payload }]) =>
        cardanoAccount$(payload.walletId).pipe(
          map(account =>
            dependencies.actions.migrateWallet.destinationCreated({
              destinationWalletId: payload.walletId,
              destinationAccountId: account.accountId,
            }),
          ),
          catchError(error =>
            failure(
              dependencies,
              'migrate-wallet.error.no-cardano-account',
              error,
            ),
          ),
          takeUntil(wizardCancelled$),
        ),
      ),
    );

    // HW destination (settings path): accountManagement emits
    // wallets.addWallet or wallets.updateWallet, not createWalletSuccess.
    // Detect via repo polling. Reconnecting the same device adds accounts to
    // the existing wallet (updateWallet), so watching for new walletIds alone
    // would miss it — watch for new accountIds instead.
    const hwDestination$ = hwDeviceConnected$.pipe(
      withLatestFrom(selectStep$, selectAll$),
      filter(([, step]) => step === 'creatingDestination'),
      switchMap(([, , existing]) => {
        const existingAccountIds = new Set<AccountId>(
          existing.flatMap(wallet =>
            wallet.accounts.map(account => account.accountId),
          ),
        );
        return selectAll$.pipe(
          map(wallets => findWalletWithNewAccount(wallets, existingAccountIds)),
          filter(isNotNil),
          take(1),
          timeout(600_000),
          mergeMap(wallet =>
            cardanoAccount$(wallet.walletId).pipe(
              map(account =>
                dependencies.actions.migrateWallet.destinationCreated({
                  destinationWalletId: wallet.walletId,
                  destinationAccountId: account.accountId,
                }),
              ),
            ),
          ),
          catchError(error =>
            failure(
              dependencies,
              'migrate-wallet.error.wallet-creation-failed',
              error,
            ),
          ),
          takeUntil(wizardCancelled$),
        );
      }),
    );

    // Fresh destination (settings path): accountManagement emits
    // wallets.addWallet, not createWalletSuccess. Detect via repo polling.
    // Gated on existing.length > 0 so it only fires for the settings path;
    // the onboarding path (wallets.length === 0) is handled by destination$.
    const freshSettingsDestination$ = destinationCreationStarted$.pipe(
      withLatestFrom(selectStep$, selectAll$),
      filter(
        ([, step, existing]) =>
          step === 'creatingDestination' && existing.length > 0,
      ),
      switchMap(([, , existing]) => {
        const existingIds = new Set(existing.map(wallet => wallet.walletId));
        return selectAll$.pipe(
          map(wallets =>
            wallets.find(wallet => !existingIds.has(wallet.walletId)),
          ),
          filter(isNotNil),
          take(1),
          timeout(600_000),
          mergeMap(newWallet =>
            cardanoAccount$(newWallet.walletId).pipe(
              map(account =>
                dependencies.actions.migrateWallet.destinationCreated({
                  destinationWalletId: newWallet.walletId,
                  destinationAccountId: account.accountId,
                }),
              ),
            ),
          ),
          catchError(error =>
            failure(
              dependencies,
              'migrate-wallet.error.wallet-creation-failed',
              error,
            ),
          ),
          takeUntil(wizardCancelled$),
        );
      }),
    );

    // Watches accountIds, not walletIds: a phrase import always creates a new
    // wallet, but a hardware source device that was connected before arrives
    // as updateWallet on its existing entry — only its account set grows.
    const source$ = sourceImportStarted$.pipe(
      withLatestFrom(selectAll$),
      switchMap(([, existing]) => {
        const existingAccountIds = new Set<AccountId>(
          existing.flatMap(wallet =>
            wallet.accounts.map(account => account.accountId),
          ),
        );
        return selectAll$.pipe(
          map(wallets => findWalletWithNewAccount(wallets, existingAccountIds)),
          filter(isNotNil),
          take(1),
          // Includes the user's auth prompt (accountManagement authenticates
          // against the existing app-lock before importing the wallet), so
          // this wait is human-paced — keep it generous. The progress step
          // offers Cancel as the escape hatch if the prompt was dismissed.
          timeout(600_000),
          mergeMap(newWallet =>
            cardanoAccount$(newWallet.walletId).pipe(
              map(account =>
                dependencies.actions.migrateWallet.sourceImported({
                  sourceWalletId: newWallet.walletId,
                  sourceAccountId: account.accountId,
                  sourceNetworkType: account.networkType,
                }),
              ),
            ),
          ),
          catchError(error =>
            failure(
              dependencies,
              'migrate-wallet.error.wallet-creation-failed',
              error,
            ),
          ),
          // Cancel during the import (incl. a dismissed auth prompt) tears this
          // watcher down, so a late-landing import or the timeout can't force
          // the abandoned wizard back to `discovering` or flip `idle` → failed.
          takeUntil(wizardCancelled$),
        );
      }),
    );

    // The onboarding path classifies device failures into a
    // HardwareErrorCategory before it lands here, so route those to the same
    // hw-error copy the settings destination path shows — the generic message
    // blames a recovery phrase no device flow asked for. Non-device reasons
    // (a fresh-phrase destination) keep the recovery-phrase copy.
    const destinationFailure$ = createWalletFailure$.pipe(
      withLatestFrom(selectStep$),
      mergeMap(([{ payload }, step]) => {
        if (step !== 'creatingDestination') return EMPTY;
        return isHardwareErrorCategory(payload.reason)
          ? failure(dependencies, `hw-error.${payload.reason}.subtitle`)
          : failure(
              dependencies,
              'migrate-wallet.error.wallet-creation-failed',
              payload.reason,
            );
      }),
    );

    // Category-specific copy here too: the hardware destination path never
    // involves a recovery phrase either.
    const hwDestinationFailure$ = hardwareWalletCreationFailed$.pipe(
      withLatestFrom(selectStep$),
      mergeMap(([{ payload }, step]) =>
        step === 'creatingDestination'
          ? failure(dependencies, `hw-error.${payload.reason}.subtitle`)
          : EMPTY,
      ),
    );

    // A device whose account is already loaded fails the import with
    // 'already-added' — the hardware analogue of the phrase screen's
    // already-loaded refusal, surfaced with the same copy. A locked device or
    // closed app is a state the user fixes in hand, not a terminal failure:
    // the importing screen shows what to fix and the import re-attempts until
    // it opens, the user cancels, or the import watchdog expires. Every other
    // category shows its own hw-error subtitle — the cause is on the screen,
    // not in a suppressed warn log, and the copy never mentions a recovery
    // phrase no device flow asked for.
    const sourceHwFailure$ = hardwareWalletCreationFailed$.pipe(
      withLatestFrom(selectStep$, selectPendingHwSource$),
      // switchMap: a later failure or a cancel supersedes a pending retry.
      switchMap(([{ payload }, step, hwSource]) => {
        if (step !== 'importingSource') return EMPTY;
        if (payload.reason === 'already-added') {
          return failure(
            dependencies,
            'migrate-wallet.error.source-already-loaded',
          );
        }
        if (
          SELF_RESOLVING_DEVICE_STATES.has(payload.reason) &&
          hwSource?.device
        ) {
          return concat(
            of(
              dependencies.actions.migrateWallet.sourceImportDeviceWaiting({
                hintKey: `hw-error.${payload.reason}.subtitle`,
              }),
            ),
            timer(DEVICE_RETRY_DELAY_MS).pipe(
              map(() =>
                dependencies.actions.accountManagement.attemptCreateHardwareWallet(
                  {
                    optionId: hwSource.optionId,
                    device: hwSource.device,
                    accountIndex: 0,
                    derivationType: hwSource.derivationType,
                    blockchainName: hwSource.blockchainName,
                    walletName: hwSource.walletName,
                    // The retry must reproduce the original dispatch, not an
                    // approximation of it: without this, a retry that succeeds
                    // opens add-wallet's success sheet over the still-running
                    // wizard — which reads as the migration having finished
                    // when it has barely started.
                    shouldSuppressSuccessSheet: true,
                  },
                ),
              ),
              takeUntil(wizardCancelled$),
            ),
          );
        }
        return failure(dependencies, `hw-error.${payload.reason}.subtitle`);
      }),
    );

    return merge(
      destination$,
      hwDestination$,
      freshSettingsDestination$,
      source$,
      destinationFailure$,
      hwDestinationFailure$,
      sourceHwFailure$,
    );
  };
