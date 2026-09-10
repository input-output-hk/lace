import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { SheetRoutes, StackRoutes } from '@lace-lib/navigation';
import { from, map, mergeMap, of } from 'rxjs';

import type { SideEffect } from '..';

// Navigation from a side effect goes through the views store (`setActivePage`
// for stack routes, `setActiveSheetPage` for sheets), which the app router
// bridges to `NavigationControls`. `NavigationControls` cannot be called here
// directly: on the extension the store runs in the service worker, where the
// navigation ref is never set.
//
// Re-pressing an entry point asks for the same route with the same params, so
// each navigation stamps the emission index as `requestId` (contract on the
// field in `@lace-contract/views`). The index is safe as an id because it
// restarts only with the subscription, and that is also when the unpersisted
// `activePage` it must differ from resets.

export const routeCreateWalletCeremony: SideEffect = (
  { vault: { createWalletCeremonyRequested$ } },
  _,
  { actions },
) =>
  createWalletCeremonyRequested$.pipe(
    map(({ payload: { origin } }, requestId) =>
      origin === 'onboarding'
        ? actions.views.setActivePage({
            route: StackRoutes.OnboardingDesktopLogin,
            requestId,
          })
        : actions.views.setActiveSheetPage({
            route: SheetRoutes.CreateNewWallet,
            requestId,
          }),
    ),
  );

export const routeImportWalletCeremony: SideEffect = (
  { vault: { importWalletCeremonyRequested$ } },
  _,
  { actions },
) =>
  importWalletCeremonyRequested$.pipe(
    mergeMap(({ payload: { origin } }, requestId) => {
      if (origin === 'onboarding') {
        return of(
          actions.views.setActivePage({
            route: StackRoutes.OnboardingRestoreWallet,
            requestId,
          }),
        );
      }
      return from([
        actions.accountManagement.clearRestoreWalletFlow(),
        actions.views.setActiveSheetPage({
          route: SheetRoutes.RestoreWalletRecoveryPhrase,
          params: { hasNestedScrolling: true },
          requestId,
        }),
      ]);
    }),
  );

export const routeAddAccountCeremony: SideEffect = (
  { vault: { addAccountCeremonyRequested$ } },
  _,
  { actions },
) =>
  addAccountCeremonyRequested$.pipe(
    map(({ payload: { walletId } }, requestId) =>
      actions.views.setActiveSheetPage({
        route: SheetRoutes.AddAccount,
        params: { walletId, hasNestedScrolling: true },
        requestId,
      }),
    ),
  );

export const routeRenameWalletCeremony: SideEffect = (
  { vault: { renameWalletCeremonyRequested$ } },
  _,
  { actions },
) =>
  renameWalletCeremonyRequested$.pipe(
    map(({ payload: { walletId } }, requestId) =>
      actions.views.setActiveSheetPage({
        route: SheetRoutes.EditWallet,
        params: { walletId },
        requestId,
      }),
    ),
  );

export const routeRenameAccountCeremony: SideEffect = (
  { vault: { renameAccountCeremonyRequested$ } },
  _,
  { actions },
) =>
  renameAccountCeremonyRequested$.pipe(
    map(({ payload: { walletId, accountId } }, requestId) =>
      actions.views.setActiveSheetPage({
        route: SheetRoutes.CustomizeAccount,
        params: { walletId, accountId },
        requestId,
      }),
    ),
  );

export const routeRemoveWalletCeremony: SideEffect = (
  { vault: { removeWalletCeremonyRequested$ } },
  _,
  { actions },
) =>
  removeWalletCeremonyRequested$.pipe(
    map(({ payload: { walletId } }) =>
      actions.accountManagement.attemptRemoveWallet({
        walletId: WalletId(walletId),
        authenticationPromptConfig: {
          cancellable: true,
          confirmButtonLabel:
            'authentication-prompt.confirm-button-label.remove-wallet',
          message: 'authentication-prompt.message.remove-wallet',
        },
      }),
    ),
  );

// The manager arm pre-selects the account by `accountIndex`; the in-app arm
// removes it by `accountId` and ignores the index.
export const routeRemoveAccountCeremony: SideEffect = (
  { vault: { removeAccountCeremonyRequested$ } },
  _,
  { actions },
) =>
  removeAccountCeremonyRequested$.pipe(
    map(({ payload: { walletId, accountId } }) =>
      actions.accountManagement.attemptRemoveAccount({
        walletId: WalletId(walletId),
        accountId: AccountId(accountId),
        authenticationPromptConfig: {
          cancellable: true,
          confirmButtonLabel:
            'authentication-prompt.confirm-button-label.remove-account',
          message: 'authentication-prompt.message.remove-account',
        },
      }),
    ),
  );

export const routeRevealRecoveryPhraseCeremony: SideEffect = (
  { vault: { revealRecoveryPhraseCeremonyRequested$ } },
  _,
  { actions },
) =>
  revealRecoveryPhraseCeremonyRequested$.pipe(
    map(({ payload: { walletId } }, requestId) =>
      actions.views.setActiveSheetPage({
        route: SheetRoutes.RecoveryPhrase,
        params: { walletId },
        requestId,
      }),
    ),
  );

export const sideEffects: SideEffect[] = [
  routeCreateWalletCeremony,
  routeImportWalletCeremony,
  routeAddAccountCeremony,
  routeRenameWalletCeremony,
  routeRenameAccountCeremony,
  routeRemoveWalletCeremony,
  routeRemoveAccountCeremony,
  routeRevealRecoveryPhraseCeremony,
];
