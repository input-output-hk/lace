import { Before } from '@wdio/cucumber-framework';
import extendedView from '../page/extendedView';
import localStorageInitializer from '../fixture/localStorageInitializer';
import popupView from '../page/popupView';
import { TestWalletName } from '../support/walletConfiguration';
import networkManager from '../utils/networkManager';
import analyticsBanner from '../elements/analyticsBanner';
import { addAndActivateWalletsInRepository } from '../fixture/walletRepositoryInitializer';
import { setUsePersistentUserId } from '../utils/browserStorage';

const extendedViewRepositoryWalletInitialization = async (walletNames: TestWalletName[]): Promise<void> => {
  await extendedView.visit();
  await localStorageInitializer.initialiseBasicLocalStorageData(walletNames[0] as TestWalletName);
  await setUsePersistentUserId();
  await addAndActivateWalletsInRepository(walletNames);
  await networkManager.logFailedRequests();
};

const popupViewRepositoryWalletInitialization = async (walletNames: TestWalletName[]): Promise<void> => {
  await extendedView.visit();
  await localStorageInitializer.initialiseBasicLocalStorageData(walletNames[0] as TestWalletName);
  await setUsePersistentUserId();
  await addAndActivateWalletsInRepository(walletNames);
  await popupView.visit();
  await networkManager.logFailedRequests();
};

Before({ tags: '@pending or @Pending' }, async () => 'skipped');

Before(
  {
    tags: '@OnboardingCreateWallet or @Staking-initial-E2E or @OnboardingRestoreWallet or @OnboardingHardwareWallet or @TrezorOnboarding or @OnboardingCreatePaperWallet or @OnboardingRestorePaperWallet'
  },
  async () => {
    await extendedView.visit();
    if (await analyticsBanner.agreeButton.isExisting()) await analyticsBanner.agreeButton.click();
  }
);

Before(
  {
    tags: '@AddressBook-extended or @Transactions-Extended or @Tokens-extended or @Staking-Extended or @LockWallet-extended or @Top-Navigation-Extended or @NFTs-Extended or @NFT-Folders-Extended or @SendTx-Bundles-Extended or @SendTx-Simple-Extended or @MainNavigation-Extended or @Send-Transaction-Metadata-Extended or @Settings-Extended or @DAppConnector or @DAppConnector-Extended or @Analytics-Settings-Extended or @Banxa-Extended or @GeneratePaperWallet or @SignMessage-Extended or @WalletAddressPage-Extended'
  },
  async () => {
    await extendedViewRepositoryWalletInitialization([TestWalletName.TestAutomationWallet]);
    await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  }
);

Before(
  {
    tags: '@Tokens-popup or @Transactions-Popup or @Staking-Popup or @LockWallet-popup or @Top-Navigation-Popup or @AddressBook-popup or @Common-Popup or @SendTx-Simple-Popup or @MainNavigation-Popup or @Settings-Popup or @NFTs-Popup or @NFT-Folders-Popup or @Send-Transaction-Metadata-Popup or @ForgotPassword or @DAppConnector-Popup or @Analytics-Settings-Popup or @Banxa-Popup'
  },
  async () => {
    await popupViewRepositoryWalletInitialization([TestWalletName.TestAutomationWallet]);
    await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  }
);

Before({ tags: '@EmptyStates-Extended' }, async () => {
  await extendedViewRepositoryWalletInitialization([TestWalletName.TAWalletNoFunds]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
});

Before({ tags: '@EmptyStates-Popup' }, async () => {
  await popupViewRepositoryWalletInitialization([TestWalletName.TAWalletNoFunds]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
});

Before(
  { tags: '@SendTx-MultipleSelection-Popup' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletSendMultipleSelection])
);

Before(
  { tags: '@SendTx-MultipleSelection-Extended' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendMultipleSelection])
);

Before(
  { tags: '@SendSimpleTransaction-Extended-E2E' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendSimpleTransactionE2E])
);

Before(
  { tags: '@SendSimpleTransaction-Popup-E2E' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletSendSimpleTransaction2E2E])
);

Before(
  { tags: '@Analytics-SendSimpleTransaction-Extended-E2E' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletAnalyticsSendSimpleTransactionE2E])
);

Before(
  { tags: '@Analytics-SendSimpleTransaction-Popup-E2E' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletAnalyticsSendSimpleTransaction2E2E])
);

Before(
  { tags: '@SendTransactionDapp-E2E' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendDappTransactionE2E])
);

Before(
  { tags: '@SendTransactionBundles-E2E ' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendBundlesTransactionE2E])
);

Before(
  { tags: '@Collateral-extended' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletCollateral])
);

Before(
  { tags: '@Collateral-popup' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletCollateral2])
);

Before({ tags: '@Staking-DelegatedFunds-Popup or @NetworkSwitching-popup' }, async () => {
  await popupViewRepositoryWalletInitialization([TestWalletName.TAWalletDelegatedFunds]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
});

Before(
  { tags: '@Staking-SwitchingPools-Popup-E2E' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletSwitchPoolsE2E])
);

Before(
  { tags: '@SendNft-Extended-E2E' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendNftE2E])
);

Before(
  { tags: '@SendNft-Popup-E2E' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletSendNft2E2E])
);

Before(
  { tags: '@AdaHandleSend-extended' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendAdaHandleE2E])
);

Before(
  { tags: '@AdaHandleSend-popup' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendAdaHandle2E2E])
);

Before(
  { tags: '@Staking-DelegatedFunds-Extended or @NetworkSwitching-extended or @DAppConnectorLowFunds' },
  async () => {
    await extendedViewRepositoryWalletInitialization([TestWalletName.TAWalletDelegatedFunds]);
    await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
  }
);

Before({ tags: '@Staking-NonDelegatedFunds-Extended or @CIP-95-Extended' }, async () => {
  await extendedViewRepositoryWalletInitialization([TestWalletName.TAWalletNonDelegatedFunds]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
});

Before({ tags: '@Staking-NonDelegatedFunds-Popup' }, async () => {
  await popupViewRepositoryWalletInitialization([TestWalletName.TAWalletNonDelegatedFunds]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
});

Before({ tags: '@OwnTags-Extended' }, async () => {
  await extendedViewRepositoryWalletInitialization([TestWalletName.MultiWallet1, TestWalletName.MultiWallet2]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
});

Before({ tags: '@OwnTags-Popup' }, async () => {
  await popupViewRepositoryWalletInitialization([TestWalletName.MultiWallet1, TestWalletName.MultiWallet2]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
});

Before(
  { tags: '@Staking-SwitchingPools-Extended-E2E' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSwitchPoolsE2E])
);

Before(
  { tags: '@AdaHandle-extended' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletAdaHandle])
);

Before(
  { tags: '@AdaHandle-popup' },
  async () => await popupViewRepositoryWalletInitialization([TestWalletName.WalletAdaHandle])
);

Before({ tags: '@Multidelegation-SwitchingPools-Extended-E2E' }, async () => {
  await extendedViewRepositoryWalletInitialization([TestWalletName.WalletMultidelegationSwitchPoolsE2E]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
});

Before(
  { tags: '@HdWallet-extended' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.HdWalletReadOnly1])
);

Before(
  { tags: '@SendNftHdWallet-Extended-E2E' },
  async () => await extendedViewRepositoryWalletInitialization([TestWalletName.WalletSendNftHdWalletE2E])
);

Before({ tags: '@Multidelegation-DelegatedFunds-SinglePool-Popup' }, async () => {
  await popupViewRepositoryWalletInitialization([TestWalletName.MultidelegationDelegatedSingle]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
  await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
});

Before({ tags: '@Multidelegation-DelegatedFunds-SinglePool-Extended' }, async () => {
  await extendedViewRepositoryWalletInitialization([TestWalletName.MultidelegationDelegatedSingle]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
  await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
});

Before({ tags: '@Multidelegation-DelegatedFunds-MultiplePools-Popup' }, async () => {
  await popupViewRepositoryWalletInitialization([TestWalletName.MultidelegationDelegatedMulti]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
  await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
});

Before({ tags: '@Multidelegation-DelegatedFunds-MultiplePools-Extended' }, async () => {
  await extendedViewRepositoryWalletInitialization([TestWalletName.MultidelegationDelegatedMulti]);
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationDAppsIssueModal();
  await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
});

Before(
  {
    tags: '@Accounts-Extended'
  },
  async () => {
    await extendedViewRepositoryWalletInitialization([TestWalletName.MultiAccActive1]);
    await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  }
);

Before(
  {
    tags: '@Accounts-Popup'
  },
  async () => {
    await popupViewRepositoryWalletInitialization([TestWalletName.MultiAccActive1]);
    await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  }
);

Before(
  { tags: '@AddNewWalletCreate or @AddNewWalletRestore or @AddNewWalletConnect or @AddNewWalletCreatePaperWallet' },
  async () => {
    await extendedViewRepositoryWalletInitialization([TestWalletName.AddNewWallet]);
    await localStorageInitializer.disableShowingMultidelegationBetaBanner();
    await localStorageInitializer.initializeShowMultiAddressDiscoveryModal(false);
    await localStorageInitializer.disableShowPinExtension();
  }
);
