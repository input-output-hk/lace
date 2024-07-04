/* eslint-disable no-undef */

import extensionUtils from './src/utils/utils';

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./src/features/**/*.feature'],
  suites: {
    batch1: [
      './src/features/Onboarding*.feature',
      './src/features/SendTransactionSimplePopup*.feature',
      './src/features/SettingsPageExtended.feature'
    ],
    batch2: [
      './src/features/MultiDelegationPageExtended*.feature',
      './src/features/SendTransactionSimpleExtended*.feature',
      './src/features/governance/CIP95StaticMethods.feature'
    ],
    batch3: [
      './src/features/AddNewWallet*.feature',
      './src/features/analytics/Analytics*.feature',
      './src/features/TokensPage*.feature'
    ],
    batch4: ['./src/features/e2e/*.feature'],
    batch5: ['./src/features/AddressBook*.feature', './src/features/Transactions*.feature'],
    batch6: [
      './src/features/Collateral*.feature',
      './src/features/NFTsFolders*.feature',
      './src/features/SendTransactionBundlesExtended.feature'
    ],
    batch7: [
      './src/features/AdaHandle*.feature',
      './src/features/DAppConnector*.feature',
      './src/features/FiatOnRampOffRampBanxa*.feature',
      './src/features/MultidelegationDelegatedFunds*.feature',
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
      './src/features/Navigation*.feature',
      './src/features/NetworkSwitching*.feature',
      './src/features/OwnTags*.feature',
      './src/features/SendTransactionMetadata*.feature',
      './src/features/SendTransactionMultipleSelection*.feature',
      './src/features/SettingsPagePopup.feature',
      './src/features/Trezor/Trezor.feature',
      './src/features/WalletAccounts*.feature'
    ]
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
    retry: 1
  } as WebdriverIO.CucumberOpts
};
