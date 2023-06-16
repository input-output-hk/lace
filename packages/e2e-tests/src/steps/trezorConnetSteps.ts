import { Given } from '@cucumber/cucumber';
import TrezorConnectPage from '../elements/trezorConnectPage';

Given(/^I click "Allow once for this session" on Trezor Connect page$/, async () => {
  await TrezorConnectPage.confirmButton.waitForClickable();
  await TrezorConnectPage.confirmButton.click();
});

Given(/^I click "Export" on Trezor Connect page$/, async () => {
  await TrezorConnectPage.confirmButton.waitForClickable();
  await TrezorConnectPage.confirmButton.click();
});
