import { Then, When } from '@cucumber/cucumber';
import WalletOption from '../elements/WalletOption';
import topNavigationAssert from '../assert/topNavigationAssert';
import MenuHeader from '../elements/menuHeader';
import WalletSettingsDrawerAssert from '../assert/WalletSettingsDrawerAssert';
import WalletSettingsDrawer from '../elements/WalletSettingsDrawer';
import { setInputFieldValue } from '../utils/inputFieldUtils';

Then(/^I open header menu$/, async () => {
  await MenuHeader.openUserMenu();
});

Then(/^I open address book from header menu$/, async () => {
  await MenuHeader.openAddressBook();
});

Then(/^I open settings from header menu$/, async () => {
  await MenuHeader.openSettings();
});

When(/^I set theme switcher to (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await MenuHeader.setExtensionTheme(mode);
});

When(/^I click on wallet number (\d)$/, async (walletIndex: number) => {
  await new WalletOption(walletIndex).clickOnWalletOptionContainer();
});

When(/^I click on "Edit" button for wallet number (\d)$/, async (walletIndex: number) => {
  await new WalletOption(walletIndex).clickOnEditButton();
});

Then(
  /^Wallet number (\d) with "([^"]*)" name is displayed on the user menu$/,
  async (walletIndex: number, walletName: string) => {
    await topNavigationAssert.assertSeeWalletOnUserMenu(walletIndex, walletName);
  }
);

Then(/^Wallet number (\d) is active$/, async (walletIndex: number) => {
  await topNavigationAssert.assertWalletIsActive(walletIndex);
});

Then(/^"Wallet settings" drawer is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await WalletSettingsDrawerAssert.assertSeeDrawer(mode);
});

When(/^I click on "(Cancel|Save)" button on "Wallet settings" page$/, async (button: 'Cancel' | 'Save') => {
  switch (button) {
    case 'Cancel':
      await WalletSettingsDrawer.clickOnCancelButton();
      break;
    case 'Save':
      await WalletSettingsDrawer.clickOnSaveButton();
      break;
    default:
      throw new Error(`Unexpected button: ${button}`);
  }
});

When(/^I enter "([^"]*)" as a new wallet name$/, async (walletName: string) => {
  await setInputFieldValue(await WalletSettingsDrawer.renameWalletInput, walletName);
});

Then(/^Wallet name error "([^"]*)" is displayed$/, async (error: string) => {
  await WalletSettingsDrawerAssert.assertSeeWalletNameError(error);
});

Then(/^"Save" button in (enabled|disabled) on "Wallet settings" page$/, async (buttonState: 'enabled' | 'disabled') => {
  await WalletSettingsDrawerAssert.assertSaveButtonEnabled(buttonState === 'enabled');
});

When(
  /^I enter "([^"]*)" as a new account name for account #(\d)$/,
  async (accountName: string, accountIndex: number) => {
    const accountNameInput = await WalletSettingsDrawer.getAccountNameInput(accountIndex);
    await accountNameInput.waitForClickable();
    await setInputFieldValue(accountNameInput, accountName);
  }
);

Then(/^Account name error "([^"]*)" is displayed for account #(\d)$/, async (error: string, accountIndex: number) => {
  await WalletSettingsDrawerAssert.assertSeeAccountNameError(error, accountIndex);
});

Then(
  /^Wallet number (\d) with "([^"]*)" account name is displayed on the user menu$/,
  async (walletIndex: number, accountName: string) => {
    await topNavigationAssert.assertSeeWalletAccountOnUserMenu(walletIndex, accountName);
  }
);
