import { Then, When } from '@cucumber/cucumber';
import menuHeaderPageObject from '../pageobject/menuHeaderPageObject';
import WalletOption from '../elements/WalletOption';
import topNavigationAssert from '../assert/topNavigationAssert';

Then(/^I open header menu$/, async () => {
  await menuHeaderPageObject.openMenu();
});

Then(/^I open address book from header menu$/, async () => {
  await menuHeaderPageObject.openAddressBook();
});

Then(/^I open settings from header menu$/, async () => {
  await menuHeaderPageObject.openSettings();
});

When(/^I set theme switcher to (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await menuHeaderPageObject.setExtensionTheme(mode);
});

When(/^I click on wallet number (\d)$/, async (walletIndex: number) => {
  await new WalletOption(walletIndex).clickOnWalletOptionContainer();
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
