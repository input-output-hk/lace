import WalletAddressPage from '../elements/walletAddressPage';
import { WalletConfig } from '../support/walletConfiguration';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import extensionUtils from '../utils/utils';

class WalletAddressPageAssert {
  async assertSeeWalletAddressPage(mode: 'extended' | 'popup') {
    await WalletAddressPage.drawerHeaderTitle.waitForDisplayed();
    if (mode === 'extended') {
      await WalletAddressPage.drawerNavigationTitle.waitForDisplayed();
      await expect(await WalletAddressPage.drawerNavigationTitle.getText()).to.equal(await t('qrInfo.receive'));
      await expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(await t('qrInfo.title'));
    } else {
      await expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(await t('qrInfo.receive'));
    }
    await WalletAddressPage.closeButton.waitForDisplayed();
    await WalletAddressPage.drawerHeaderSubtitle.waitForDisplayed();
    await expect(await WalletAddressPage.drawerHeaderSubtitle.getText()).to.equal(
      await t('qrInfo.scanQRCodeToConnectWallet')
    );
    await WalletAddressPage.qrCode.waitForDisplayed();
    await WalletAddressPage.walletName.waitForDisplayed();
    await WalletAddressPage.walletAddress.waitForDisplayed();
    await WalletAddressPage.copyButton.waitForDisplayed();
    await expect(await WalletAddressPage.copyButton.getText()).to.equal(await t('core.infoWallet.copy'));
  }

  async assertSeeWalletNameAndAddress(wallet: WalletConfig) {
    await expect(await WalletAddressPage.walletName.getText()).to.equal(wallet.name);
    await expect(await WalletAddressPage.walletAddress.getText()).to.equal(
      extensionUtils.isMainnet() ? wallet.mainnetAddress : wallet.address
    );
  }
}

export default new WalletAddressPageAssert();
