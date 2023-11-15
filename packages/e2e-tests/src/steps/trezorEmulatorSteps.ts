import { Given } from '@cucumber/cucumber';
import { clickImageOnScreenshot } from '../utils/trezorEmulatorApiClient';
import { browser } from '@wdio/globals';

Given(/^I connect, unlock and enter correct pin on Trezor emulator$/, async () => {
  await clickImageOnScreenshot('notConnectedTrezor.png');
  await clickImageOnScreenshot('tapToUnlock.png');
  await clickImageOnScreenshot('pin.png');
  await clickImageOnScreenshot('confirmPin.png');
});

Given(/^I confirm exporting public key on Trezor emulator$/, async () => {
  await browser.pause(3000);
  await clickImageOnScreenshot('confirm.png');
});
