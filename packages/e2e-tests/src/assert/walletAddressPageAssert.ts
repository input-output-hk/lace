import WalletAddressPage from '../elements/walletAddressPage';
import { WalletConfig } from '../support/walletConfiguration';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import extensionUtils from '../utils/utils';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';

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

  // eslint-disable-next-line no-undef
  async getSrc(item: WebdriverIO.Element) {
    return item.$('img').getAttribute('src');
  }

  async assertSeeAdaHandleAddressCard() {
    const displayedAdaHandleNames: string[] = [];
    const displayedAdaHandleNamesElementArray = await WalletAddressPage.handleNames;
    const displayedAdaHandleImages = await WalletAddressPage.handleImages.map(this.getSrc);

    for (const displayedAdaHandleNamesElement of displayedAdaHandleNamesElementArray) {
      await displayedAdaHandleNamesElement.waitForDisplayed();
      displayedAdaHandleNames.push(await displayedAdaHandleNamesElement.getText());
    }
    testContext.save('displayedAdaHandleNames', displayedAdaHandleNames);
    testContext.save('displayedAdaHandleImages', displayedAdaHandleImages);
  }

  async assertSeeAdaHandleAddressCardWithName(handleName: string) {
    const handleCard = await WalletAddressPage.getHandleAddressCard(handleName);
    await handleCard.waitForDisplayed();
    await handleCard.$(WalletAddressPage.HANDLE_IMAGE).waitForDisplayed();
    await handleCard.$(WalletAddressPage.HANDLE_NAME).waitForDisplayed();
    await handleCard.$(WalletAddressPage.HANDLE_SYMBOL).waitForDisplayed();
  }

  async assertSeeTheShortestHandleFirst() {
    const names: string[] = testContext.load('displayedAdaHandleNames');
    expect(names[0]).equals(Asset.ADA_HANDLE_1.name);
    for (let i = 0; i < names.length - 1; i++) {
      expect(names[i].length).to.be.lessThanOrEqual(names[i + 1].length);
    }
  }
}

export default new WalletAddressPageAssert();
