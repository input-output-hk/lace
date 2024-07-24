import { Then, When } from '@cucumber/cucumber';
import WalletAccountsAssert from '../assert/WalletAccountsMenuAssert';
import WalletOption from '../elements/WalletOption';
import WalletAccounts from '../elements/accounts/WalletAccountsMenu';
import WalletAccountsMenuItem from '../elements/accounts/WalletAccountsMenuItem';
import WalletAccountsUnlockDrawerAssert from '../assert/WalletAccountsUnlockDrawerAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import WalletAccountsUnlockDrawer from '../elements/accounts/WalletAccountsUnlockDrawer';

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

When(
  /^I (see|do not see|click) unlock button: (\d+)$/,
  async (action: 'see' | 'do not see' | 'click', accountNumber: number) => {
    const accountItem = new WalletAccountsMenuItem(accountNumber);
    switch (action) {
      case 'see':
        await accountItem.accountEnableButton.waitForDisplayed();
        break;
      case 'do not see':
        await accountItem.accountEnableButton.waitForDisplayed({ reverse: true });
        break;
      case 'click':
        await accountItem.accountEnableButton.click();
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
);

When(/^I click account item: (\d+)$/, async (accountNumber: number) => {
  const accountItem = new WalletAccountsMenuItem(accountNumber);
  await accountItem.container.waitForClickable();
  await accountItem.container.click();
});

Then(
  /^I (see|do not see) account unlock drawer with all elements in (popup|extended) mode$/,
  async (shouldBeDisplayed: 'see' | 'do not', mode: 'popup' | 'extended') => {
    await WalletAccountsUnlockDrawerAssert.assertSeeUnlockDrawer(mode, shouldBeDisplayed === 'see');
  }
);

When(
  /^I fill (valid|invalid) password on the account unlock drawer$/,
  async (expectedPassword: 'valid' | 'invalid') => {
    const password =
      expectedPassword === 'valid' ? String(getTestWallet(TestWalletName.MultiAccActive1).password) : 'somePassword';
    await WalletAccountsUnlockDrawer.passwordInput.setValue(password);
  }
);

Then(/^I click "(Confirm|Cancel)" button on the account unlock drawer$/, async (button: 'Confirm' | 'Cancel') => {
  await (button === 'Confirm'
    ? WalletAccountsUnlockDrawer.clickConfirmButton()
    : WalletAccountsUnlockDrawer.clickCancelButton());
});

Then(/^I see wallet unlock error$/, async () => {
  await WalletAccountsUnlockDrawerAssert.assertSeeUnlockError();
});

Then(/^I see "Account #(\d+) activated" toast$/, async (accountNumber: number) => {
  await WalletAccountsUnlockDrawerAssert.assertSeeAccountActivatedToast(accountNumber);
});
