import { vi } from 'vitest';

// Mock the entire navigation module to avoid React Native dependencies
vi.mock('@lace-lib/navigation', () => ({
  navigationRef: {
    isReady: () => true,
    navigate: vi.fn(),
    reset: vi.fn(),
  },
  NavigationControls: {
    sheets: {
      navigate: vi.fn(),
      close: vi.fn(),
    },
    actions: {
      closeAndNavigate: vi.fn(),
    },
  },
  SheetRoutes: {
    Initial: 'Initial',
    AddedAccountSuccess: 'AddedAccountSuccess',
    AddedAccountFailed: 'AddedAccountFailed',
    RemoveAccount: 'RemoveAccount',
    RemoveAccountSuccess: 'RemoveAccountSuccess',
    RemoveWalletSuccess: 'RemoveWalletSuccess',
    RestoreWalletSuccess: 'RestoreWalletSuccess',
    SuccessCreateNewWallet: 'SuccessCreateNewWallet',
  },
  StackRoutes: {
    Home: 'Home',
    AccountDetails: 'AccountDetails',
    WalletSettings: 'WalletSettings',
    Collateral: 'Collateral',
    OnboardingStart: 'OnboardingStart',
  },
  TabRoutes: {
    Portfolio: 'Portfolio',
    Rewards: 'Rewards',
    DApps: 'DApps',
    Settings: 'Settings',
    AccountCenter: 'Accounts',
  },
}));
