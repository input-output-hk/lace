import { Given } from '@cucumber/cucumber';
import { clickImageOnScreenshot } from '../utils/trezorEmulatorApiClient';
import { browser } from '@wdio/globals';
import extendedView from '../page/extendedView';

Given(/^I connect, unlock and enter correct pin on Trezor emulator$/, async () => {
  await clickImageOnScreenshot('tapToConnect.png');
  await clickImageOnScreenshot('pinNumber.png');
  await clickImageOnScreenshot('checkmarkButton.png');
});

Given(/^I confirm exporting public key on Trezor emulator$/, async () => {
  await browser.pause(3000);
  await clickImageOnScreenshot('expandButton.png');
  await clickImageOnScreenshot('confirmButton.png');
});

Given(/^I force the Trezor account setup page to open$/, async () => {
  await extendedView.visitTrezorSetupAccountPageWithOverride();
});
