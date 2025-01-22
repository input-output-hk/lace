import WalletAccountsUnlockDrawer from '../elements/accounts/WalletAccountsUnlockDrawer';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import ToastMessageAssert from './toastMessageAssert';

class WalletAccountsUnlockDrawerAssert {
  async assertSeeUnlockDrawer(mode: 'extended' | 'popup', shouldSee: boolean) {
    await WalletAccountsUnlockDrawer.drawerBody.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      if (mode === 'extended') {
        await WalletAccountsUnlockDrawer.drawerNavigationTitle.waitForDisplayed();
        expect(await WalletAccountsUnlockDrawer.drawerNavigationTitle.getText()).to.equal(
          await t('account.enable.title')
        );
      }
      await WalletAccountsUnlockDrawer.drawerHeaderBackButton.waitForDisplayed();
      await WalletAccountsUnlockDrawer.drawerHeaderCloseButton.waitForDisplayed({ reverse: true });

      await WalletAccountsUnlockDrawer.headline.waitForDisplayed();
      expect(await WalletAccountsUnlockDrawer.headline.getText()).to.equal(await t('account.enable.inMemory.headline'));

      await WalletAccountsUnlockDrawer.description.waitForDisplayed();
      expect(await WalletAccountsUnlockDrawer.description.getText()).to.equal(
        await t('account.enable.inMemory.description')
      );

      await WalletAccountsUnlockDrawer.passwordInput.waitForDisplayed();

      await WalletAccountsUnlockDrawer.passwordInputPlaceholder.waitForDisplayed();
      expect(await WalletAccountsUnlockDrawer.passwordInputPlaceholder.getText()).to.equal(
        await t('account.enable.inMemory.passwordPlaceholder')
      );

      await WalletAccountsUnlockDrawer.passwordInputButton.waitForDisplayed();

      await WalletAccountsUnlockDrawer.confirmButton.waitForDisplayed();
      expect(await WalletAccountsUnlockDrawer.confirmButton.getText()).to.equal(
        await t('account.enable.inMemory.confirm')
      );

      await WalletAccountsUnlockDrawer.cancelButton.waitForDisplayed();
      expect(await WalletAccountsUnlockDrawer.cancelButton.getText()).to.equal(
        await t('account.enable.inMemory.cancel')
      );
    }
  }

  async assertSeeUnlockError() {
    await WalletAccountsUnlockDrawer.error.waitForDisplayed();
    expect(await WalletAccountsUnlockDrawer.error.getText()).to.equal(await t('account.enable.inMemory.wrongPassword'));
  }

  async assertSeeAccountActivatedToast(accountNumber: number) {
    const translationKey = (await t('multiWallet.activated.account')).replace(
      '{{accountName}}',
      `Account #${accountNumber}`
    );
    await ToastMessageAssert.assertSeeToastMessage(translationKey, true);
  }
}

export default new WalletAccountsUnlockDrawerAssert();
