import { expect } from 'chai';
import { t } from '../../utils/translationService';
import EnterYourPasswordDrawer from '../../elements/settings/EnterYourPasswordDrawer';

class EnterYourPasswordDrawerAssert {
  async assertSeeSecureYourPaperWalletDrawer() {
    await EnterYourPasswordDrawer.drawerHeaderCloseButton.waitForClickable();
    await EnterYourPasswordDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await EnterYourPasswordDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
    await EnterYourPasswordDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await EnterYourPasswordDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('paperWallet.SettingsDrawer.passphraseStage.title')
    );
    await EnterYourPasswordDrawer.drawerHeaderSubtitle.waitForDisplayed();
    expect(await EnterYourPasswordDrawer.drawerHeaderSubtitle.getText()).to.equal(
      await t('paperWallet.SettingsDrawer.passphraseStage.subtitle')
    );

    await EnterYourPasswordDrawer.passwordInput.container.waitForEnabled();

    await EnterYourPasswordDrawer.bannerIcon.waitForDisplayed();
    await EnterYourPasswordDrawer.bannerDescription.waitForDisplayed();
    expect(await EnterYourPasswordDrawer.bannerDescription.getText()).to.equal(
      await t('browserView.settings.security.showPassphraseDrawer.warning')
    );

    await EnterYourPasswordDrawer.generatePaperWalletButton.waitForEnabled();
    expect(await EnterYourPasswordDrawer.generatePaperWalletButton.getText()).to.equal(
      await t('browserView.settings.generatePaperWallet.title')
    );
  }

  async assertGeneratePaperWalletButtonEnabled(shouldBeEnabled: boolean): Promise<void> {
    await EnterYourPasswordDrawer.generatePaperWalletButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }
}

export default new EnterYourPasswordDrawerAssert();
