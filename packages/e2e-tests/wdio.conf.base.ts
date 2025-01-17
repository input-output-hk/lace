/* eslint-disable no-undef */

import extensionUtils from './src/utils/utils';
import fs from 'fs';
import { Logger } from './src/support/logger';

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./src/features/**/*.feature'],
  suites: {
    batch1: ['./src/features/Onboarding*.feature'],
    batch2: ['./src/features/SettingsPageExtended*.feature'],
    batch3: ['./src/features/SendTransactionMetadata*.feature'],
    batch4: ['./src/features/SendTransactionMultipleSelection*.feature'],
    batch5: ['./src/features/SendTransactionSimpleExtended.part2.feature'],
    batch6: ['./src/features/SendTransactionSimpleExtended.part3.feature'],
    batch7: ['./src/features/governance/CIP95StaticMethods.feature'],
    batch8: ['./src/features/analytics/AnalyticsActivity*.feature'],
    batch0: ['./src/features/analytics/AnalyticsAddress*.feature'],
    batch10: ['./src/features/analytics/AnalyticsEventProperties*.feature'],
    batch11: ['./src/features/analytics/AnalyticsFiatOnRampOffRamp.feature'],
    batch12: ['./src/features/analytics/AnalyticsForgotPassword.feature'],
    batch13: ['./src/features/analytics/AnalyticsNavigation*.feature'],
    batch14: ['./src/features/analytics/AnalyticsNFTs*.feature'],
    batch15: ['./src/features/analytics/AnalyticsOnboardingEvents.feature'],
    batch16: ['./src/features/SettingsGeneratePaperWallet.feature'],
    batch17: ['./src/features/e2e/MultidelegationSwitchingPoolsExtendedE2E.feature'],
    batch18: ['./src/features/e2e/SendNft*.feature'],
    batch19: ['./src/features/TokensPage*.feature'],
    batch20: ['./src/features/AddressBook*.feature'],
    batch21: ['./src/features/MultidelegationDelegatedFundsSingle*.feature'],
    batch22: ['./src/features/Collateral*.feature'],
    batch23: ['./src/features/NavigationTop*.feature'],
    batch24: ['./src/features/AdaHandleSend*.feature'],
    batch25: ['./src/features/SendTransactionSimpleExtended.part1.feature'],
    batch26: ['./src/features/SendTransactionSimpleExtended.part4.feature'],
    batch27: ['./src/features/DAppConnector*.feature'],
    batch28: ['./src/features/FiatOnRampOffRampBanxa*.feature'],
    batch29: ['./src/features/MultidelegationDelegatedFundsMultiple*.feature'],
    batch30: ['./src/features/NFTsExtended.feature'],
    batch31: ['./src/features/NFTsPopup.feature'],
    batch32: ['./src/features/EmptyStates*.feature'],
    batch33: ['./src/features/ForgotPassword.feature'],
    batch34: ['./src/features/FullExperiencePopup.feature'],
    batch35: ['./src/features/HdWalletExtended.feature'],
    batch36: ['./src/features/LockWallet*.feature'],
    batch37: ['./src/features/MultiDelegationPagePopup.feature'],
    batch38: ['./src/features/NavigationMain*.feature'],
    batch39: ['./src/features/NetworkSwitching*.feature'],
    batch40: ['./src/features/OwnTags*.feature'],
    batch41: ['./src/features/Trezor/Trezor.feature'],
    batch42: ['./src/features/WalletAccounts*.feature'],
    batch43: ['./src/features/SendTransactionSimplePopup*.feature'],
    batch44: ['./src/features/MultiDelegationPageExtended*.feature'],
    batch45: ['./src/features/analytics/AnalyticsSend*.feature'],
    batch46: ['./src/features/analytics/AnalyticsSetting*.feature'],
    batch47: ['./src/features/analytics/AnalyticsStaking*.feature'],
    batch48: ['./src/features/analytics/AnalyticsToggle*.feature'],
    batch49: ['./src/features/analytics/AnalyticsToken*.feature'],
    batch50: ['./src/features/AdaHandleExtended.feature'],
    batch51: ['./src/features/AdaHandlePopup.feature'],
    batch52: ['./src/features/AddNewWallet*.feature'],
    batch53: ['./src/features/e2e/SendTransactionDappE2E.feature'],
    batch54: ['./src/features/e2e/SendTransactionBundlesE2E.feature'],
    batch55: ['./src/features/e2e/SendTransactionSimple*.feature'],
    batch56: ['./src/features/e2e/StakingInitialFundsE2E.feature'],
    batch57: ['./src/features/e2e/StakingSwitchingPools*.feature'],
    batch58: ['./src/features/SettingsPagePopup*.feature'],
    batch59: ['./src/features/WalletAddressPageExtended.feature'],
    batch60: ['./src/features/Transactions*.feature'],
    batch61: ['./src/features/NFTsFolders*.feature', './src/features/SignMessage.feature'],
    batch62: ['./src/features/SendTransactionBundlesExtended*.feature']
  },
  automationProtocol: 'webdriver',
  exclude: [],
  maxInstances: 1,
  maxInstancesPerCapability: 1,
  path: '/',
  logLevel: 'error',
  outputDir: 'logs',
  bail: 0,
  baseUrl: '',
  capabilities: [],
  injectGlobals: true,
  waitforTimeout: 6000,
  connectionRetryTimeout: 16_000,
  connectionRetryCount: 3,
  framework: 'cucumber',
  reporters: [
    [
      'spec',
      {
        realtimeReporting: true
      }
    ],
    [
      'allure',
      {
        outputDir: './reports/allure/results',
        disableWebdriverStepsReporting: true,
        disableWebdriverScreenshotsReporting: false,
        issueLinkTemplate: 'https://input-output.atlassian.net/browse/{}',
        useCucumberStepReporter: true,
        addConsoleLogs: true
      }
    ]
  ],
  cucumberOpts: {
    backtrace: true,
    requireModule: [],
    failAmbiguousDefinitions: true,
    failFast: false,
    ignoreUndefinedDefinitions: false,
    names: [],
    snippets: true,
    source: true,
    profile: [],
    require: ['./src/steps/*.ts', './src/hooks/*.ts'],
    // scenarioLevelReporter: true,
    order: 'defined',
    snippetSyntax: undefined,
    strict: true,
    tags: extensionUtils.isMainnet() ? '@Mainnet' : '@Testnet',
    tagsInTitle: true,
    timeout: 200_000,
    retry: 1,
    noStrictFlaky: true
  } as WebdriverIO.CucumberOpts,
  async onPrepare() {
    if (!fs.existsSync('./src/support/walletConfiguration.ts')) {
      Logger.log('walletConfiguration.ts is missing, decrypt the file first!');
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }
};
