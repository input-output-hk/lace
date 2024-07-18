import { Then, When } from '@cucumber/cucumber';
import WalletOption from '../elements/WalletOption';
import topNavigationAssert from '../assert/topNavigationAssert';
import MenuHeader from '../elements/menuHeader';

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

Then(
  /^Wallet number (\d) with "([^"]*)" name is displayed on the user menu$/,
  async (walletIndex: number, walletName: string) => {
    await topNavigationAssert.assertSeeWalletOnUserMenu(walletIndex, walletName);
  }
);

Then(/^Wallet number (\d) is active$/, async (walletIndex: number) => {
  await topNavigationAssert.assertWalletIsActive(walletIndex);
});
