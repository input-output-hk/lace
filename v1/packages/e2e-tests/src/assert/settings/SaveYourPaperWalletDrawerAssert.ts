import { t } from '../../utils/translationService';
import { expect } from 'chai';
import SaveYourPaperWalletDrawer from '../../elements/settings/SaveYourPaperWalletDrawer';

class SaveYourPaperWalletDrawerAssert {
  async assertSeeSaveYourPaperWalletPage(expectedPaperWalletName: string) {
    await SaveYourPaperWalletDrawer.drawerHeaderCloseButton.waitForClickable();
    await SaveYourPaperWalletDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('browserView.settings.heading')
    );
    await SaveYourPaperWalletDrawer.drawerHeaderTitle.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('paperWallet.savePaperWallet.title')
    );
    await SaveYourPaperWalletDrawer.drawerHeaderSubtitle.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.drawerHeaderSubtitle.getText()).to.equal(
      await t('paperWallet.savePaperWallet.description')
    );

    await SaveYourPaperWalletDrawer.paperWalletName.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.paperWalletName.getText()).to.equal(expectedPaperWalletName);
    await SaveYourPaperWalletDrawer.containsLabel.waitForDisplayed();

    expect(await SaveYourPaperWalletDrawer.containsLabel.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.contains')
    );
    await SaveYourPaperWalletDrawer.privateQrCodeIcon.waitForDisplayed();
    await SaveYourPaperWalletDrawer.privateQrCodeTitle.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.privateQrCodeTitle.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.privateQrTitle')
    );
    await SaveYourPaperWalletDrawer.privateQrCodeDescription.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.privateQrCodeDescription.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.privateQrDescription')
    );
    await SaveYourPaperWalletDrawer.publicQrCodeIcon.waitForDisplayed();
    await SaveYourPaperWalletDrawer.publicQrCodeTitle.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.publicQrCodeTitle.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.publicQrTitle')
    );
    await SaveYourPaperWalletDrawer.publicQrCodeDescription.waitForDisplayed();
    expect(await SaveYourPaperWalletDrawer.publicQrCodeDescription.getText()).to.equal(
      await t('core.paperWallet.savePaperWallet.publicQrDescription')
    );

    await SaveYourPaperWalletDrawer.downloadButton.waitForClickable();
    expect(await SaveYourPaperWalletDrawer.downloadButton.getText()).to.equal(
      await t('paperWallet.savePaperWallet.downloadBtnLabel')
    );
    await SaveYourPaperWalletDrawer.printButton.waitForClickable();
    expect(await SaveYourPaperWalletDrawer.printButton.getText()).to.equal(
      await t('paperWallet.savePaperWallet.printBtnLabel')
    );
  }
}

export default new SaveYourPaperWalletDrawerAssert();
