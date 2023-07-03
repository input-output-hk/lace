import { Before } from '@wdio/cucumber-framework';
import extendedView from '../page/extendedView';
import localStorageInitializer from '../fixture/localStorageInitializer';
import popupView from '../page/popupView';
import { TestWalletName } from '../support/walletConfiguration';
import networkManager from '../utils/networkManager';

const extendedViewWalletInitialization = async (walletName = TestWalletName.TestAutomationWallet): Promise<void> => {
  await extendedView.visit();
  await localStorageInitializer.initializeWallet(walletName);
  await extendedView.visit();
  await networkManager.logFailedRequests();
};

const popupViewWalletInitialization = async (walletName = TestWalletName.TestAutomationWallet): Promise<void> => {
  await extendedView.visit();
  await localStorageInitializer.initializeWallet(walletName);
  await popupView.visit();
  await networkManager.logFailedRequests();
};

Before(
  { tags: '@OnboardingCreateWallet or @Staking-initial-E2E or @OnboardingRestoreWallet or @OnboardingHardwareWallet' },
  async () => await extendedView.visit()
);

Before(
  {
    tags: '@AddressBook-extended or @Transactions-Extended or @Tokens-extended or @Staking-Extended or @LockWallet-extended or @Top-Navigation-Extended or @NFTs-Extended or @NFT-Folders-Extended or @SendTx-Bundles-Extended or @SendTx-Simple-Extended or @MainNavigation-Extended or @Send-Transaction-Metadata-Extended or @Settings-Extended or @DAppConnector or @DAppConnector-Extended'
  },
  async () => await extendedViewWalletInitialization()
);

Before(
  {
    tags: '@Tokens-popup or @Transactions-Popup or @Staking-Popup or @LockWallet-popup or @Top-Navigation-Popup or @AddressBook-popup or @Common-Popup or @SendTx-Simple-Popup or @MainNavigation-Popup or @Settings-Popup or @NFTs-Popup or @NFT-Folders-Popup or @Send-Transaction-Metadata-Popup or @ForgotPassword or @DAppConnector-Popup'
  },
  async () => await popupViewWalletInitialization()
);

Before(
  { tags: '@EmptyStates-Extended' },
  async () => await extendedViewWalletInitialization(TestWalletName.TAWalletNoFunds)
);

Before({ tags: '@EmptyStates-Popup' }, async () => await popupViewWalletInitialization(TestWalletName.TAWalletNoFunds));

Before(
  { tags: '@SendTx-MultipleSelection-Popup' },
  async () => await popupViewWalletInitialization(TestWalletName.WalletSendMultipleSelection)
);

Before(
  { tags: '@SendTx-MultipleSelection-Extended' },
  async () => await extendedViewWalletInitialization(TestWalletName.WalletSendMultipleSelection)
);

Before(
  { tags: '@SendSimpleTransaction-Extended-E2E or @SendTransactionDapp-E2E' },
  async () => await extendedViewWalletInitialization(TestWalletName.WalletSendSimpleTransactionE2E)
);

Before(
  { tags: '@SendSimpleTransaction-Popup-E2E' },
  async () => await popupViewWalletInitialization(TestWalletName.WalletSendSimpleTransactionE2E)
);

Before(
  { tags: '@SendTransactionBundles-E2E ' },
  async () => await extendedViewWalletInitialization(TestWalletName.WalletSendBundlesTransactionE2E)
);

Before(
  { tags: '@Collateral-extended' },
  async () => await extendedViewWalletInitialization(TestWalletName.WalletCollateral)
);

Before({ tags: '@Collateral-popup' }, async () => await popupViewWalletInitialization(TestWalletName.WalletCollateral));

Before(
  { tags: '@Staking-DelegatedFunds-Popup' },
  async () => await popupViewWalletInitialization(TestWalletName.TAWalletDelegatedFunds)
);

Before(
  { tags: '@Staking-SwitchingPools-Popup-E2E' },
  async () => await popupViewWalletInitialization(TestWalletName.WalletSwitchPoolsE2E)
);

Before(
  { tags: '@SendNft-Extended-E2E' },
  async () => await extendedViewWalletInitialization(TestWalletName.WalletSendNftE2E)
);

Before(
  { tags: '@SendNft-Popup-E2E' },
  async () => await popupViewWalletInitialization(TestWalletName.WalletSendNftE2E)
);

Before(
  { tags: '@Staking-DelegatedFunds-Extended' },
  async () => await extendedViewWalletInitialization(TestWalletName.TAWalletDelegatedFunds)
);

Before(
  { tags: '@Staking-NonDelegatedFunds-Extended' },
  async () => await extendedViewWalletInitialization(TestWalletName.TAWalletNonDelegatedFunds)
);

Before(
  { tags: '@Staking-SwitchingPools-Extended-E2E' },
  async () => await extendedViewWalletInitialization(TestWalletName.WalletSwitchPoolsE2E)
);
