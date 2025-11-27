import { DataTable, Then, When } from '@cucumber/cucumber';
import CIP95TestDApp from '../elements/CIP95TestDApp';
import DAppConnectorAssert, { ExpectedDAppDetails } from '../assert/dAppConnectorAssert';
import CIP95StaticMethodsAssert from '../assert/CIP95StaticMethodsAssert';
import DAppConnectorUtils from '../utils/DAppConnectorUtils';
import { browser } from '@wdio/globals';

const testDAppDetails: ExpectedDAppDetails = {
  hasLogo: true,
  name: CIP95TestDApp.CIP95_TEST_DAPP_NAME,
  url: CIP95TestDApp.CIP95_TEST_DAPP_URL
};

When(/^I open CIP-95 test DApp$/, async () => {
  await CIP95TestDApp.openTestDApp();
});

Then(/^I see CIP-95 test DApp authorization window$/, async () => {
  await DAppConnectorUtils.waitAndSwitchToDAppConnectorWindow(3);
  await DAppConnectorAssert.assertSeeAuthorizeDAppPage(testDAppDetails);
});

When(/^I switch to window with CIP-95 test DApp$/, async () => {
  await browser.pause(1000);
  await CIP95TestDApp.switchToTestDAppWindow();
});

Then(/^I wait for CIP-95 test DApp to be populated with data$/, async () => {
  await browser.waitUntil(async () => (await CIP95TestDApp.pubDRepKey.getText()).length > 25, {
    timeout: 30_000,
    interval: 1000
  });
});

Then(/^.getPubDRepKey\(\) returned "([^"]*)"$/, async (expectedPubDRepKey: string) => {
  await CIP95StaticMethodsAssert.assertSeeResultForGetPubDRepKey(expectedPubDRepKey);
});

Then(/^.getRegisteredPubStakeKeys\(\) did not return anything$/, async () => {
  await CIP95StaticMethodsAssert.assertSeeNoResultsForGetRegisteredPubStakeKeys();
});

Then(/^.getRegisteredPubStakeKeys\(\) returned:$/, async (testData: DataTable) => {
  await CIP95StaticMethodsAssert.assertSeeResultsForGetRegisteredPubStakeKeys(testData);
});

Then(/^.getUnregisteredPubStakeKeys\(\) did not return anything$/, async () => {
  await CIP95StaticMethodsAssert.assertSeeNoResultsForGetUnregisteredPubStakeKeys();
});

Then(/^.getUnregisteredPubStakeKeys\(\) returned:$/, async (testData: DataTable) => {
  await CIP95StaticMethodsAssert.assertSeeResultsForGetUnregisteredPubStakeKeys(testData);
});
