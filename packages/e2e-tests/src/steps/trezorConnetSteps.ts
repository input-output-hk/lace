import { Given } from '@cucumber/cucumber';
import TrezorConnectPage from '../elements/trezorConnectPage';

Given(/^I reject analytics and click "Allow once for this session" on Trezor Connect page$/, async () => {
  await TrezorConnectPage.analyticsToggleButton.waitForClickable();
  await TrezorConnectPage.analyticsToggleButton.click();
  await TrezorConnectPage.analyticsConfirmButton.waitForClickable();
  await TrezorConnectPage.analyticsConfirmButton.click();
  await TrezorConnectPage.confirmButton.waitForClickable();
  await TrezorConnectPage.confirmButton.click();
});

Given(/^I click "Export" on Trezor Connect page$/, async () => {
  await TrezorConnectPage.exportButton.waitForClickable();
  await TrezorConnectPage.exportButton.click();
});
