import { Then, When } from '@cucumber/cucumber';
import WalletAccountsAssert from '../assert/WalletAccountsMenuAssert';
import WalletOption from '../elements/WalletOption';
import WalletAccounts from '../elements/accounts/WalletAccountsMenu';
import WalletAccountsMenuItem from '../elements/accounts/WalletAccountsMenuItem';
import WalletAccountsUnlockDrawerAssert from '../assert/WalletAccountsUnlockDrawerAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import WalletAccountsUnlockDrawer from '../elements/accounts/WalletAccountsUnlockDrawer';
import HoldUpDisableAccountDialog from '../elements/accounts/HoldUpDisableAccountDialog';
import MainLoader from '../elements/MainLoader';
import MenuHeader from '../elements/menuHeader';

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
  /^I (see|do not see|click) "(enable|disable)" button: (\d+)$/,
  async (action: 'see' | 'do not see' | 'click', expectedButton: 'enable' | 'disable', accountNumber: number) => {
    const accountItem = new WalletAccountsMenuItem(accountNumber);
    const button = await (expectedButton === 'enable'
      ? accountItem.accountEnableButton
      : accountItem.accountDisableButton);

    switch (action) {
      case 'see':
        await button.waitForDisplayed();
        break;
      case 'do not see':
        await button.waitForDisplayed({ reverse: true });
        break;
      case 'click':
        await button.click();
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

Then(/^I (see|do not see) "Hold Up!" account disable modal$/, async (shouldSee: 'see' | 'do not see') => {
  await WalletAccountsAssert.assertSeeHoldUpModal(shouldSee === 'see');
});

Then(/^I click "(Cancel|Disable)" on "Hold Up!" account disable modal$/, async (button: 'Cancel' | 'Disable') => {
  await (button === 'Cancel'
    ? HoldUpDisableAccountDialog.clickCancelButton()
    : HoldUpDisableAccountDialog.clickConfirmButton());
});

When(/^One of additional accounts is active$/, async () => {
  await MenuHeader.clickMenuButton();
  await new WalletOption(1).clickOnAccountsMenuButton();
  const accountItem = new WalletAccountsMenuItem(3);
  await accountItem.accountEnableButton.waitForClickable();
  await accountItem.accountEnableButton.click();
  const password = String(getTestWallet(TestWalletName.TestAutomationWallet).password);
  await WalletAccountsUnlockDrawer.passwordInput.waitForClickable();
  await WalletAccountsUnlockDrawer.passwordInput.setValue(password);
  await WalletAccountsUnlockDrawer.clickConfirmButton();
  await MainLoader.waitUntilLoaderDisappears();
});
