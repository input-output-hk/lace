/* eslint-disable no-undef */
/* eslint-disable unicorn/prefer-module */

import { config as baseConfig } from './wdio.conf.base';

if (!process.env.FIREFOX_BINARY) {
  throw new Error('Environment variable FIREFOX_BINARY is not set. Please set it before running tests.');
}

const firefoxConfig = {
  suites: {
    batch1: [
      './src/features/OnboardingCreate*.feature',
      './src/features/OnboardingRestore*.feature',
      './src/features/SettingsPageExtended*.feature',
      './src/features/SendTransactionMetadata*.feature',
      './src/features/SendTransactionMultipleSelection*.feature'
    ],
    batch2: [
      './src/features/SendTransactionSimpleExtended.part2.feature',
      './src/features/SendTransactionSimpleExtended.part3.feature',
      './src/features/governance/CIP95StaticMethods.feature'
    ],
    batch3: ['./src/features/SettingsGeneratePaperWallet.feature', './src/features/e2e/SendTransactionDappE2E.feature'],
    batch4: [
      './src/features/e2e/MultidelegationSwitchingPoolsExtendedE2E.feature',
      './src/features/e2e/SendNft*.feature',
      './src/features/TokensPage*.feature'
    ],
    batch5: ['./src/features/AddressBook*.feature', './src/features/MultidelegationDelegatedFundsSingle*.feature'],
    batch6: [
      './src/features/Collateral*.feature',
      './src/features/NavigationTop*.feature',
      './src/features/AdaHandleSend*.feature',
      './src/features/SendTransactionSimpleExtended.part1.feature',
      './src/features/SendTransactionSimpleExtended.part4.feature'
    ],
    batch7: [
      './src/features/DAppConnector*.feature',
      './src/features/FiatOnRampOffRampBanxa*.feature',
      './src/features/MultidelegationDelegatedFundsMultiple*.feature',
      './src/features/NFTsExtended.feature',
      './src/features/NFTsPopup.feature'
    ],
    batch8: [
      './src/features/EmptyStates*.feature',
      './src/features/ForgotPassword.feature',
      './src/features/FullExperiencePopup.feature',
      './src/features/HdWalletExtended.feature',
      './src/features/LockWallet*.feature',
      './src/features/MultiDelegationPagePopup.feature',
      './src/features/NavigationMain*.feature',
      './src/features/NetworkSwitching*.feature',
      './src/features/OwnTags*.feature',
      './src/features/Trezor/Trezor.feature',
      './src/features/WalletAccounts*.feature'
    ],
    batch9: ['./src/features/SendTransactionSimplePopup*.feature'],
    batch10: ['./src/features/MultiDelegationPageExtended*.feature'],
    batch11: ['./src/features/e2e/StakingInitialFundsE2E.feature', './src/features/SharedWalletOnboarding.feature'],
    batch12: [
      './src/features/AdaHandleExtended.feature',
      './src/features/AdaHandlePopup.feature',
      './src/features/AddNewWalletCreate*.feature',
      './src/features/e2e/SendTransactionBundlesE2E.feature'
    ],
    batch13: [
      './src/features/e2e/SendTransactionSimple*.feature',
      './src/features/e2e/StakingSwitchingPools*.feature',
      './src/features/SettingsPagePopup*.feature',
      './src/features/WalletAddressPageExtended.feature'
    ],
    batch14: [
      './src/features/Transactions*.feature',
      './src/features/NamiMode*.feature',
      './src/features/VotingCenter*.feature'
    ],
    batch15: ['./src/features/NFTsFolders*.feature', './src/features/SignMessage.feature'],
    batch16: ['./src/features/SendTransactionBundlesExtended*.feature']
  },
  capabilities: [
    {
      maxInstances: 1,
      browserName: 'firefox',
      ...(String(process.env.STANDALONE_DRIVER) === 'true' && { hostname: 'localhost' }),
      ...(String(process.env.STANDALONE_DRIVER) === 'true' && { port: 4444 }),
      'moz:debuggerAddress': true,
      'moz:firefoxOptions': {
        binary: process.env.FIREFOX_BINARY,
        args: ['--width=1920', '--height=1080'],
        prefs: {
          'dom.events.testing.asyncClipboard': true, // Enables clipboard access in tests
          'clipboard.autocopy': true, // Allows copying to the clipboard
          'permissions.default.clipboard': 1 // Grants clipboard permissions
        }
      }
    }
  ],
  services: [
    [
      'firefox-profile',
      {
        extensions: [`${import.meta.dirname}/../../apps/browser-extension-wallet/dist`],
        'xpinstall.signatures.required': false
      }
    ]
  ]
};

if (String(process.env.STANDALONE_DRIVER) === 'true') {
  fetch('http://127.0.0.1:4444/wd/hub').catch(() => {
    throw new Error("geckodriver doesn't seem to be running, please start it first");
  });
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const config: WebdriverIO.Config = { ...baseConfig, ...firefoxConfig };
