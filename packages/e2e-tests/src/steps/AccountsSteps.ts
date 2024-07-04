import { Then, When } from '@cucumber/cucumber';
import WalletAccountsAssert from '../assert/WalletAccountsMenuAssert';
import WalletOption from '../elements/WalletOption';
import WalletAccounts from '../elements/accounts/WalletAccountsMenu';

When(/^I click on chevron for wallet number (\d)$/, async (walletIndex: number) => {
  await new WalletOption(walletIndex).clickOnAccountsMenuButton();
});

Then(/^"Accounts" menu (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await WalletAccountsAssert.assertSeeAccountsMenu(shouldBeDisplayed === 'is');
});

When(/^I click on back arrow button on "Accounts" menu$/, async () => {
  await WalletAccounts.clickOnBackArrow();
});

Then(/^I see (\d+) accounts on the list$/, async (accountsQuantity: number) => {
  await WalletAccountsAssert.assertAccountsQuantity(accountsQuantity);
});

Then(/^each account item contains icon, logo and path$/, async () => {
  await WalletAccountsAssert.assertSeeEachAccountItem();
});
