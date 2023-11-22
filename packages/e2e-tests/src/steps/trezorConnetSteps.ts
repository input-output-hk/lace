import { Given } from '@cucumber/cucumber';
import TrezorConnectPage from '../elements/trezorConnectPage';

Given(/^I reject analytics and click "Allow once for this session" on Trezor Connect page$/, async () => {
  await TrezorConnectPage.clickOnAnalyticsToggleButton();
  await TrezorConnectPage.clickOnAnalyticsConfirmButton();
  await TrezorConnectPage.clickOnConfirmButton();
});

Given(/^I click "Export" on Trezor Connect page$/, async () => {
  await TrezorConnectPage.clickOnExportButton();
});
