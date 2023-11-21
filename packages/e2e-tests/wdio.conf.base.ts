/* eslint-disable no-undef */

import * as dns from 'dns';
import extensionUtils from './src/utils/utils';

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: [['./src/features/**/*.feature']],
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
    'spec',
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
    tagExpression: extensionUtils.isMainnet() ? '@Mainnet and not @Pending' : '@Testnet and not @Pending',
    tagsInTitle: true,
    timeout: 200_000,
    retry: 1
  } as WebdriverIO.CucumberOpts,
  async beforeSession() {
    await dns.setDefaultResultOrder('ipv4first');
  }
};
