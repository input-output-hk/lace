import { Given } from '@cucumber/cucumber';
import TrezorConnectPage from '../elements/trezorConnectPage';
import { switchToWindowWithRetry } from '../utils/window';

Given(/^I reject analytics and click "Allow once for this session" on Trezor Connect page$/, async () => {
  await switchToWindowWithRetry('TrezorConnect');
  await TrezorConnectPage.clickOnAnalyticsToggleButton();
  await TrezorConnectPage.clickOnAnalyticsConfirmButton();

  await browser.pause(4000);
  await switchToWindowWithRetry('TrezorConnect'); // page is reloaded so we need to re-connect the driver
  await TrezorConnectPage.clickOnConfirmButton();
});

Given(/^I click "Export" on Trezor Connect page$/, async () => {
  await switchToWindowWithRetry('TrezorConnect');
  await TrezorConnectPage.clickOnExportButton();
});
