import { WalletConfig } from '../../support/walletConfiguration';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import WalletAddressPage from '../../elements/walletAddressPage';

class WalletPublicKeyDrawerAssert {
  async assertSeePublicKey(wallet: WalletConfig) {
    await WalletAddressPage.walletAddress.waitForDisplayed();
    await expect(await WalletAddressPage.walletAddress.getText()).to.equal(wallet.publicKey);
  }

  async assertSeeQrCode() {
    await WalletAddressPage.qrCode.waitForDisplayed();
  }

  async assertSeeCopyButton(shouldSee: boolean) {
    await WalletAddressPage.copyButton.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      await expect(await WalletAddressPage.copyButton.getText()).to.equal(await t('general.button.copy'));
    }
  }

  async assertSeePublicKeyPage(mode: 'extended' | 'popup') {
    await WalletAddressPage.drawerHeaderTitle.waitForDisplayed();
    await expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.settings.wallet.general.showPubKey')
    );
    await WalletAddressPage.drawerHeaderBackButton.waitForDisplayed();
    if (mode === 'extended') {
      await WalletAddressPage.drawerNavigationTitle.waitForDisplayed();
      await expect(await WalletAddressPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.settings.heading')
      );
      await WalletAddressPage.drawerHeaderCloseButton.waitForDisplayed();
    }
    await this.assertSeeQrCode();
    await WalletAddressPage.walletName.waitForDisplayed();
    await WalletAddressPage.walletAddress.waitForDisplayed();
    await this.assertSeeCopyButton(true);
  }

  async assertSeeWalletName(wallet: WalletConfig) {
    await WalletAddressPage.walletName.waitForDisplayed();
    await expect(await WalletAddressPage.walletName.getText()).to.equal(wallet.name);
  }
}

export default new WalletPublicKeyDrawerAssert();
