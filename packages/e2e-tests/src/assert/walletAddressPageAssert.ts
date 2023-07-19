import WalletAddressPage from '../elements/walletAddressPage';
import { WalletConfig } from '../support/walletConfiguration';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import extensionUtils from '../utils/utils';

class WalletAddressPageAssert {
  async assertSeeWalletAddressPage(mode: 'extended' | 'popup') {
    await WalletAddressPage.drawerHeaderTitle.waitForClickable();
    if (mode === 'extended') {
      await WalletAddressPage.drawerNavigationTitle.waitForDisplayed();
      await expect(await WalletAddressPage.drawerNavigationTitle.getText()).to.equal(await t('qrInfo.receive'));
      await expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(await t('qrInfo.title'));
    } else {
      await expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(await t('qrInfo.receive'));
    }
    await WalletAddressPage.drawerHeaderCloseButton.waitForDisplayed();
    await WalletAddressPage.drawerHeaderSubtitle.waitForDisplayed();
    await expect(await WalletAddressPage.drawerHeaderSubtitle.getText()).to.equal(
      await t('qrInfo.scanQRCodeToConnectWallet')
    );
    await WalletAddressPage.qrCode.waitForDisplayed();
    await WalletAddressPage.walletName.waitForDisplayed();
    await WalletAddressPage.walletAddress.waitForDisplayed();
    // LW-6604 copy button visible after hovering over address card
    await WalletAddressPage.drawerHeaderTitle.moveTo(); // step introduced to avoid situation when WebdriverIO keeps cursor in the middle of the Lace popup by default
    await WalletAddressPage.copyButton.waitForDisplayed({ reverse: true });
    await WalletAddressPage.addressCard.moveTo();
    await WalletAddressPage.copyButton.waitForDisplayed();
  }

  async assertSeeWalletNameAndAddress(wallet: WalletConfig, mode: 'extended' | 'popup') {
    await expect(await WalletAddressPage.walletName.getText()).to.equal(wallet.name);
    const address = String(extensionUtils.isMainnet() ? wallet.mainnetAddress : wallet.address);
    const expectedAddress = mode === 'extended' ? address : `${address.slice(0, 7)}...${address.slice(-8)}`;
    await expect(await WalletAddressPage.walletAddress.getText()).to.equal(expectedAddress);
  }
}

export default new WalletAddressPageAssert();
