import { Then, When } from '@cucumber/cucumber';
import DAppConnectorAssert, { ExpectedAuthorizedDAppDetails } from '../assert/dAppConnectorAssert';
import DAppConnectorPageObject from '../pageobject/dAppConnectorPageObject';
import { browser } from '@wdio/globals';
import { waitUntilExpectedNumberOfHandles } from '../utils/window';

When(/^I open test DApp$/, async () => {
  await DAppConnectorPageObject.openTestDApp();
});

Then(/^I see DApp authorization window$/, async () => {
  await DAppConnectorPageObject.waitAndSwitchToAuthorizationWindow();
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(
    DAppConnectorPageObject.TEST_DAPP_NAME,
    DAppConnectorPageObject.TEST_DAPP_URL
  );
});

Then(/^I don't see DApp authorization window$/, async () => {
  await browser.pause(2000);
  await waitUntilExpectedNumberOfHandles(2);
});

Then(/^I see DApp connection modal$/, async () => {
  await DAppConnectorAssert.assertSeeDAppConnectionModal();
});

Then(/^I click "(Authorize|Cancel)" button in DApp authorization window$/, async (button: 'Authorize' | 'Cancel') => {
  await DAppConnectorPageObject.clickButtonInDAppAuthorizationWindow(button);
});

Then(/^I click "(Always|Only once)" button in DApp authorization modal$/, async (button: 'Always' | 'Only once') => {
  await DAppConnectorPageObject.clickButtonInDAppAuthorizationModal(button);
});

Then(/^I see Lace wallet info in DApp when not connected$/, async () => {
  await DAppConnectorAssert.assertWalletFoundButNotConnectedInTestDApp();
});

Then(/^I see "Authorized DApps" section empty state in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorAssert.assertSeeAuthorizedDAppsEmptyState(mode);
});

Then(/^I see test DApp on the Authorized DApps list$/, async () => {
  const expectedDapp: ExpectedAuthorizedDAppDetails = {
    hasLogo: true,
    name: DAppConnectorPageObject.TEST_DAPP_NAME,
    url: DAppConnectorPageObject.TEST_DAPP_URL.split('/')[2]
  };
  await DAppConnectorAssert.assertSeeAuthorizedDAppsOnTheList([expectedDapp]);
});

When(/^I open and authorize test DApp with "(Always|Only once)" setting$/, async (mode: 'Always' | 'Only once') => {
  await DAppConnectorPageObject.openTestDApp();

  await DAppConnectorPageObject.waitAndSwitchToAuthorizationWindow();
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(
    DAppConnectorPageObject.TEST_DAPP_NAME,
    DAppConnectorPageObject.TEST_DAPP_URL
  );
  await DAppConnectorPageObject.clickButtonInDAppAuthorizationWindow('Authorize');
  await DAppConnectorPageObject.clickButtonInDAppAuthorizationModal(mode);
});

Then(/^I de-authorize all DApps in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await DAppConnectorPageObject.deauthorizeAllDApps(mode);
});
