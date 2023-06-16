import { Given } from '@cucumber/cucumber';
import { clickImageOnScreenshot, lockTrezorDevice } from '../utils/trezorEmulatorManager';
import { browser } from '@wdio/globals';

Given(/^I Unlock and enter correct pin on Trezor emulator$/, async () => {
  await clickImageOnScreenshot('trezorLogo.png');
  await clickImageOnScreenshot('lockedTrezor.png', true);
  await clickImageOnScreenshot('pin.png', true);
  await clickImageOnScreenshot('confirmSmall.png', true);
});

Given(/^I confirm exporting public key on Trezor emulator$/, async () => {
  await browser.pause(3000);
  await clickImageOnScreenshot('trezorLogo.png');
  await clickImageOnScreenshot('confirmBig.png');
});

Given(/^I lock trezor$/, async () => {
  await lockTrezorDevice();
});
