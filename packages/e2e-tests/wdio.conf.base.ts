/* eslint-disable no-undef */

import extensionUtils from './src/utils/utils';

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./src/features/**/*.feature'],
  suites: {
    batch1: [
      './src/features/Onboarding*.feature',
      './src/features/SettingsPageExtended*.feature',
      './src/features/SendTransactionMetadata*.feature',
      './src/features/SendTransactionMultipleSelection*.feature'
    ],
    batch2: [
      './src/features/SendTransactionSimpleExtended.part2.feature',
      './src/features/SendTransactionSimpleExtended.part3.feature',
      './src/features/governance/CIP95StaticMethods.feature'
    ],
    batch3: [
      './src/features/analytics/AnalyticsActivity*.feature',
      './src/features/analytics/AnalyticsAddress*.feature',
      './src/features/analytics/AnalyticsEventProperites*.feature',
      './src/features/analytics/AnalyticsFiatOnRampOffRamp.feature',
      './src/features/analytics/AnalyticsForgotPassword.feature',
      './src/features/analytics/AnalyticsNavigation*.feature',
      './src/features/analytics/AnalyticsNFTs*.feature',
      './src/features/analytics/AnalyticsOnboardingEvents.feature'
    ],
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
    batch11: [
      './src/features/analytics/AnalyticsSend*.feature',
      './src/features/analytics/AnalyticsSetting*.feature',
      './src/features/analytics/AnalyticsStaking*.feature',
      './src/features/analytics/AnalyticsToggle*.feature',
      './src/features/analytics/AnalyticsToken*.feature'
    ],
    batch12: [
      './src/features/AdaHandleExtended.feature',
      './src/features/AdaHandlePopup.feature',
      './src/features/AddNewWallet*.feature',
      './src/features/e2e/SendTransactionDappE2E.feature',
      './src/features/e2e/SendTransactionBundlesE2E.feature'
    ],
    batch13: [
      './src/features/e2e/SendTransactionSimple*.feature',
      './src/features/e2e/StakingInitialFundsE2E.feature',
      './src/features/e2e/StakingSwitchingPools*.feature',
      './src/features/SettingsPagePopup*.feature'
    ],
    batch14: ['./src/features/Transactions*.feature'],
    batch15: ['./src/features/NFTsFolders*.feature'],
    batch16: ['./src/features/SendTransactionBundlesExtended*.feature']
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
  } as WebdriverIO.CucumberOpts
};
