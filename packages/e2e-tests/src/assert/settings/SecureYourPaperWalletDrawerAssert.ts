import SecureYourPaperWalletDrawer from '../../elements/settings/SecureYourPaperWalletDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class SecureYourPaperWalletDrawerAssert {
  async assertSeeSecureYourPaperWalletDrawer() {
    await SecureYourPaperWalletDrawer.drawerHeaderCloseButton.waitForClickable();
    await SecureYourPaperWalletDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await SecureYourPaperWalletDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
    await SecureYourPaperWalletDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await SecureYourPaperWalletDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('paperWallet.securePaperWallet.title')
    );
    await SecureYourPaperWalletDrawer.drawerHeaderSubtitle.waitForDisplayed();
    expect(await SecureYourPaperWalletDrawer.drawerHeaderSubtitle.getText()).to.equal(
      await t('paperWallet.securePaperWallet.description')
    );

    await SecureYourPaperWalletDrawer.pgpKeyNameInputLabel.waitForDisplayed();
    expect(await SecureYourPaperWalletDrawer.pgpKeyNameInputLabel.getText()).to.equal(
      await t('core.paperWallet.securePaperWallet.pgpPublicKeyReference')
    );
    await SecureYourPaperWalletDrawer.pgpKeyNameInput.waitForDisplayed();
    await SecureYourPaperWalletDrawer.yourPublicPgpKeyBlockInputLabel.waitForDisplayed();
    expect(await SecureYourPaperWalletDrawer.yourPublicPgpKeyBlockInputLabel.getText()).to.equal(
      await t('core.paperWallet.securePaperWallet.pgpPublicKeyLabel')
    );
    await SecureYourPaperWalletDrawer.yourPublicPgpKeyBlockInput.waitForDisplayed();

    await SecureYourPaperWalletDrawer.nextButton.waitForDisplayed();
    expect(await SecureYourPaperWalletDrawer.nextButton.getText()).to.equal(await t('send.form.next'));
  }

  async assertNextButtonEnabled(shouldBeEnabled: boolean): Promise<void> {
    await SecureYourPaperWalletDrawer.nextButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new SecureYourPaperWalletDrawerAssert();
