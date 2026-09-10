import {
  accountManagementActions,
  clearRestoreWalletSecrets,
} from '@lace-contract/account-management';
import { clearPendingCreateWalletSecrets } from '@lace-contract/onboarding-v2';
import { vaultActions } from '@lace-contract/vault';
import { viewsActions } from '@lace-contract/views';
import { AccountId, WalletId } from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  routeAddAccountCeremony,
  routeCreateWalletCeremony,
  routeImportWalletCeremony,
  routeRemoveAccountCeremony,
  routeRemoveWalletCeremony,
  routeRenameAccountCeremony,
  routeRenameWalletCeremony,
  routeRevealRecoveryPhraseCeremony,
} from '../../src/store/side-effects';

vi.mock('@lace-lib/navigation', () => ({
  StackRoutes: {
    OnboardingDesktopLogin: 'OnboardingDesktopLogin',
    OnboardingRestoreWallet: 'OnboardingRestoreWallet',
  },
  SheetRoutes: {
    CreateNewWallet: 'CreateNewWallet',
    RestoreWalletRecoveryPhrase: 'RestoreWalletRecoveryPhrase',
    AddAccount: 'AddAccount',
    CustomizeAccount: 'CustomizeAccount',
    EditWallet: 'EditWallet',
    RecoveryPhrase: 'RecoveryPhrase',
  },
}));

vi.mock('@lace-contract/onboarding-v2', () => ({
  clearPendingCreateWalletSecrets: vi.fn(),
}));

vi.mock('@lace-contract/account-management', async () => {
  const { createAction } = await import('@reduxjs/toolkit');
  return {
    accountManagementActions: {
      accountManagement: {
        clearRestoreWalletFlow: createAction(
          'accountManagement/clearRestoreWalletFlow',
        ),
        attemptRemoveWallet: createAction(
          'accountManagement/attemptRemoveWallet',
        ),
        attemptRemoveAccount: createAction(
          'accountManagement/attemptRemoveAccount',
        ),
      },
    },
    clearRestoreWalletSecrets: vi.fn(),
  };
});

const actions = {
  ...vaultActions,
  ...viewsActions,
  ...accountManagementActions,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('routeCreateWalletCeremony', () => {
  it('routes the onboarding origin to the create stack page', () => {
    testSideEffect(routeCreateWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          createWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.createWalletCeremonyRequested({
              origin: 'onboarding',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.views.setActivePage({
            route: 'OnboardingDesktopLogin',
            requestId: 0,
          }),
        });
      },
    }));
  });

  it('routes the management origin to the create sheet', () => {
    testSideEffect(routeCreateWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          createWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.createWalletCeremonyRequested({
              origin: 'management',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.views.setActiveSheetPage({
            route: 'CreateNewWallet',
            requestId: 0,
          }),
        });
      },
    }));
  });

  it('gives a repeat request a fresh requestId so the router sees a state change', () => {
    testSideEffect(routeCreateWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          createWalletCeremonyRequested$: cold('-a-a', {
            a: vaultActions.vault.createWalletCeremonyRequested({
              origin: 'onboarding',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a-b', {
          a: actions.views.setActivePage({
            route: 'OnboardingDesktopLogin',
            requestId: 0,
          }),
          b: actions.views.setActivePage({
            route: 'OnboardingDesktopLogin',
            requestId: 1,
          }),
        });
      },
    }));
  });

  it('leaves the UI-process create secrets untouched', () => {
    testSideEffect(routeCreateWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          createWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.createWalletCeremonyRequested({
              origin: 'onboarding',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.views.setActivePage({
            route: 'OnboardingDesktopLogin',
            requestId: 0,
          }),
        });
      },
    }));

    expect(clearPendingCreateWalletSecrets).not.toHaveBeenCalled();
  });
});

describe('routeImportWalletCeremony', () => {
  it('routes the onboarding origin to the restore stack page', () => {
    testSideEffect(routeImportWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          importWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.importWalletCeremonyRequested({
              origin: 'onboarding',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.views.setActivePage({
            route: 'OnboardingRestoreWallet',
            requestId: 0,
          }),
        });
      },
    }));
  });

  it('clears the restore flow and routes the management origin to the restore sheet', () => {
    testSideEffect(routeImportWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          importWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.importWalletCeremonyRequested({
              origin: 'management',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-(ab)', {
          a: actions.accountManagement.clearRestoreWalletFlow(),
          b: actions.views.setActiveSheetPage({
            route: 'RestoreWalletRecoveryPhrase',
            params: { hasNestedScrolling: true },
            requestId: 0,
          }),
        });
      },
    }));
  });

  it('gives a repeat request a fresh requestId so the router sees a state change', () => {
    testSideEffect(routeImportWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          // Spaced so the second emission clears the four frames the first
          // `(ab)` group occupies.
          importWalletCeremonyRequested$: cold('-a----a', {
            a: vaultActions.vault.importWalletCeremonyRequested({
              origin: 'management',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-(ab)-(ac)', {
          a: actions.accountManagement.clearRestoreWalletFlow(),
          b: actions.views.setActiveSheetPage({
            route: 'RestoreWalletRecoveryPhrase',
            params: { hasNestedScrolling: true },
            requestId: 0,
          }),
          c: actions.views.setActiveSheetPage({
            route: 'RestoreWalletRecoveryPhrase',
            params: { hasNestedScrolling: true },
            requestId: 1,
          }),
        });
      },
    }));
  });

  it('leaves the UI-process create and restore secrets untouched', () => {
    testSideEffect(routeImportWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          importWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.importWalletCeremonyRequested({
              origin: 'management',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-(ab)', {
          a: actions.accountManagement.clearRestoreWalletFlow(),
          b: actions.views.setActiveSheetPage({
            route: 'RestoreWalletRecoveryPhrase',
            params: { hasNestedScrolling: true },
            requestId: 0,
          }),
        });
      },
    }));

    expect(clearPendingCreateWalletSecrets).not.toHaveBeenCalled();
    expect(clearRestoreWalletSecrets).not.toHaveBeenCalled();
  });
});

describe('routeAddAccountCeremony', () => {
  it('routes to the add-account sheet with the walletId', () => {
    testSideEffect(routeAddAccountCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          addAccountCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.addAccountCeremonyRequested({
              walletId: 'w1',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.views.setActiveSheetPage({
            route: 'AddAccount',
            params: { walletId: 'w1', hasNestedScrolling: true },
            requestId: 0,
          }),
        });
      },
    }));
  });

  it('gives a repeat request for the same wallet a fresh requestId', () => {
    testSideEffect(routeAddAccountCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          addAccountCeremonyRequested$: cold('-a-a', {
            a: vaultActions.vault.addAccountCeremonyRequested({
              walletId: 'w1',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a-b', {
          a: actions.views.setActiveSheetPage({
            route: 'AddAccount',
            params: { walletId: 'w1', hasNestedScrolling: true },
            requestId: 0,
          }),
          b: actions.views.setActiveSheetPage({
            route: 'AddAccount',
            params: { walletId: 'w1', hasNestedScrolling: true },
            requestId: 1,
          }),
        });
      },
    }));
  });
});

describe('routeRenameWalletCeremony', () => {
  it('routes to the edit-wallet sheet with the walletId', () => {
    testSideEffect(routeRenameWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          renameWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.renameWalletCeremonyRequested({
              walletId: 'w1',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.views.setActiveSheetPage({
            route: 'EditWallet',
            params: { walletId: 'w1' },
            requestId: 0,
          }),
        });
      },
    }));
  });
});

describe('routeRemoveWalletCeremony', () => {
  it('dispatches the authenticated remove-wallet flow', () => {
    testSideEffect(routeRemoveWalletCeremony, ({ cold, expectObservable }) => ({
      actionObservables: {
        vault: {
          removeWalletCeremonyRequested$: cold('-a', {
            a: vaultActions.vault.removeWalletCeremonyRequested({
              walletId: 'w1',
            }),
          }),
        },
      },
      dependencies: { actions },
      assertion: sideEffect$ => {
        expectObservable(sideEffect$).toBe('-a', {
          a: actions.accountManagement.attemptRemoveWallet({
            walletId: WalletId('w1'),
            authenticationPromptConfig: {
              cancellable: true,
              confirmButtonLabel:
                'authentication-prompt.confirm-button-label.remove-wallet',
              message: 'authentication-prompt.message.remove-wallet',
            },
          }),
        });
      },
    }));
  });
});

describe('routeRenameAccountCeremony', () => {
  it('routes to the customize-account sheet with the walletId and accountId', () => {
    testSideEffect(
      routeRenameAccountCeremony,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          vault: {
            renameAccountCeremonyRequested$: cold('-a', {
              a: vaultActions.vault.renameAccountCeremonyRequested({
                walletId: 'w1',
                accountId: 'a1',
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.views.setActiveSheetPage({
              route: 'CustomizeAccount',
              params: { walletId: 'w1', accountId: 'a1' },
              requestId: 0,
            }),
          });
        },
      }),
    );
  });
});

describe('routeRemoveAccountCeremony', () => {
  it('dispatches the authenticated remove-account flow by accountId', () => {
    testSideEffect(
      routeRemoveAccountCeremony,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          vault: {
            removeAccountCeremonyRequested$: cold('-a', {
              a: vaultActions.vault.removeAccountCeremonyRequested({
                walletId: 'w1',
                accountId: 'a1',
                accountIndex: 2,
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.accountManagement.attemptRemoveAccount({
              walletId: WalletId('w1'),
              accountId: AccountId('a1'),
              authenticationPromptConfig: {
                cancellable: true,
                confirmButtonLabel:
                  'authentication-prompt.confirm-button-label.remove-account',
                message: 'authentication-prompt.message.remove-account',
              },
            }),
          });
        },
      }),
    );
  });
});

describe('routeRevealRecoveryPhraseCeremony', () => {
  it('routes to the recovery-phrase sheet with the walletId', () => {
    testSideEffect(
      routeRevealRecoveryPhraseCeremony,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          vault: {
            revealRecoveryPhraseCeremonyRequested$: cold('-a', {
              a: vaultActions.vault.revealRecoveryPhraseCeremonyRequested({
                walletId: 'w1',
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.views.setActiveSheetPage({
              route: 'RecoveryPhrase',
              params: { walletId: 'w1' },
              requestId: 0,
            }),
          });
        },
      }),
    );
  });
});
