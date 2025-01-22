import { Given, Then, When } from '@cucumber/cucumber';
import walletLockScreenAssert from '../assert/walletLockScreenAssert';
import walletUnlockScreenAssert from '../assert/walletUnlockScreenAssert';
import WalletUnlockPage from '../elements/walletUnlockPage';
import popupView from '../page/popupView';
import { browser } from '@wdio/globals';
import MenuHeader from '../elements/menuHeader';

Given(/^I see locked wallet screen$/, async () => {
  await walletLockScreenAssert.assertSeeWalletLockScreen();
});

Then(/^I see unlock wallet screen$/, async () => {
  await walletUnlockScreenAssert.assertSeeWalletUnlockScreen();
});

Given(/^I am on lock screen$/, async () => {
  await MenuHeader.lockWallet();
});

Given(/^I am on unlock screen$/, async () => {
  await MenuHeader.lockWallet();
  await browser.pause(1000);
  await popupView.visit(false);
});

Given(/^I lock my wallet$/, async () => {
  await MenuHeader.lockWallet();
});

When(/^I fill password input with (correct|incorrect) password$/, async (type: 'correct' | 'incorrect') => {
  const password = type === 'correct' ? String(process.env.WALLET_1_PASSWORD) : 'wrongPassword';
  await WalletUnlockPage.passwordInput.setValue(password);
});

Then(/^"Unlock" button is (enabled|disabled) on unlock screen$/, async (state: 'enabled' | 'disabled') => {
  await walletUnlockScreenAssert.assertSeeUnlockButtonEnabled(state === 'enabled');
});

When(/^I click "(Unlock|Help and support)" button on unlock screen$/, async (button: 'Unlock' | 'Help and support') => {
  switch (button) {
    case 'Unlock':
      await WalletUnlockPage.unlockButton.waitForClickable();
      await WalletUnlockPage.unlockButton.click();
      break;
    case 'Help and support':
      await WalletUnlockPage.helpAndSupportButton.waitForClickable();
      await WalletUnlockPage.helpAndSupportButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});
