import { WalletConfig } from '../../support/walletConfiguration';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import ShowPublicKeyDrawer from '../../elements/settings/ShowPublicKeyDrawer';

class WalletPublicKeyDrawerAssert {
  async assertSeePublicKey(wallet: WalletConfig) {
    await ShowPublicKeyDrawer.walletAddress.waitForDisplayed();
    await expect(await ShowPublicKeyDrawer.walletAddress.getText()).to.equal(wallet.publicKey);
  }

  async assertSeeQrCode() {
    await ShowPublicKeyDrawer.qrCode.waitForDisplayed();
  }

  async assertSeeCopyButton(shouldSee: boolean) {
    await ShowPublicKeyDrawer.copyButton.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await expect(await ShowPublicKeyDrawer.copyButton.getText()).to.equal(await t('general.button.copy'));
    }
  }

  async assertSeePublicKeyPage(mode: 'extended' | 'popup') {
    await ShowPublicKeyDrawer.drawerHeaderTitle.waitForDisplayed();
    await expect(await ShowPublicKeyDrawer.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.wallet.general.showPubKey')
    );
    await ShowPublicKeyDrawer.drawerHeaderBackButton.waitForDisplayed();
    if (mode === 'extended') {
      await ShowPublicKeyDrawer.drawerNavigationTitle.waitForDisplayed();
      await expect(await ShowPublicKeyDrawer.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );
      await ShowPublicKeyDrawer.drawerHeaderCloseButton.waitForDisplayed();
    }
    await this.assertSeeQrCode();
    await ShowPublicKeyDrawer.walletName.waitForDisplayed();
    await ShowPublicKeyDrawer.walletAddress.waitForDisplayed();
    await this.assertSeeCopyButton(true);
  }

  async assertSeeWalletName(wallet: WalletConfig) {
    await ShowPublicKeyDrawer.walletName.waitForDisplayed();
    await expect(await ShowPublicKeyDrawer.walletName.getText()).to.equal(wallet.name);
  }
}

export default new WalletPublicKeyDrawerAssert();
