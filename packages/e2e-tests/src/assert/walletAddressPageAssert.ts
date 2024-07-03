import WalletAddressPage from '../elements/walletAddressPage';
import { WalletConfig } from '../support/walletConfiguration';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import extensionUtils from '../utils/utils';
import testContext from '../utils/testContext';
import { Asset } from '../data/Asset';
import adaHandleAssert from './adaHandleAssert';

class WalletAddressPageAssert {
  async assertSeeWalletAddressPage(mode: 'extended' | 'popup') {
    await WalletAddressPage.drawerHeaderTitle.waitForClickable();
    if (mode === 'extended') {
      await WalletAddressPage.drawerNavigationTitle.waitForStable();
      expect(await WalletAddressPage.drawerNavigationTitle.getText()).to.equal(await t('qrInfo.receive'));
      expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(await t('qrInfo.title'));
    } else {
      await WalletAddressPage.drawerHeaderTitle.waitForStable();
      expect(await WalletAddressPage.drawerHeaderTitle.getText()).to.equal(await t('qrInfo.receive'));
    }
    await WalletAddressPage.drawerHeaderCloseButton.waitForDisplayed();
    await WalletAddressPage.drawerHeaderSubtitle.waitForDisplayed();
    expect(await WalletAddressPage.drawerHeaderSubtitle.getText()).to.equal(
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
    expect(await WalletAddressPage.walletName.getText()).to.equal(wallet.name);
    const address = String(extensionUtils.isMainnet() ? wallet.mainnetAddress : wallet.address);
    const expectedAddress = mode === 'extended' ? address : `${address.slice(0, 7)}...${address.slice(-8)}`;
    expect(await WalletAddressPage.walletAddress.getText()).to.equal(expectedAddress);
  }

  async assertSeeAdaHandleAddressCard() {
    const handleNames: string[] = [];
    const handleImageSrcs: string[] = [];
    const handleNameElements = await WalletAddressPage.handleNames;
    await handleNameElements[0].waitForDisplayed();

    // to fully load all handle cards
    await handleNameElements[handleNameElements.length - 1].scrollIntoView();
    await adaHandleAssert.assertSeeCustomImage(
      await (await WalletAddressPage.getHandleAddressCard(Asset.ADA_HANDLE_3.name))
        .$(WalletAddressPage.HANDLE_IMAGE)
        .$('img')
    );

    const handleImageElements = await WalletAddressPage.handleImages;

    for (const name of handleNameElements) {
      handleNames.push(await name.getText());
    }

    for (const image of handleImageElements) {
      handleImageSrcs.push(await image.$('img').getAttribute('src'));
    }

    testContext.save('displayedAdaHandleNames', handleNames);
    testContext.save('displayedAdaHandleImages', handleImageSrcs);
  }

  async assertSeeAdaHandleAddressCardWithName(handleName: string, shouldSee: boolean) {
    await WalletAddressPage.addressCard.waitForStable();
    const handleCard = await WalletAddressPage.getHandleAddressCard(handleName);
    if (shouldSee) {
      await handleCard.waitForDisplayed();
      await handleCard.$(WalletAddressPage.HANDLE_IMAGE).waitForDisplayed();
      await handleCard.$(WalletAddressPage.HANDLE_NAME).waitForDisplayed();
      await handleCard.$(WalletAddressPage.HANDLE_SYMBOL).waitForDisplayed();
    } else {
      expect(handleCard).to.be.undefined;
    }
  }

  async assertSeeTheShortestHandleFirst() {
    const names: string[] = testContext.load('displayedAdaHandleNames');
    expect(names[0]).equals(Asset.ADA_HANDLE_1.name);
    for (let i = 0; i < names.length - 1; i++) {
      expect(names[i].length).to.be.lessThanOrEqual(names[i + 1].length);
    }
  }

  async assertSeeAdaHandleCardWithCustomImage() {
    await this.assertSeeAdaHandleAddressCardWithName(Asset.ADA_HANDLE_3.name, true);
    const handleCard = await WalletAddressPage.getHandleAddressCard(Asset.ADA_HANDLE_3.name);
    await adaHandleAssert.assertSeeCustomImage(await handleCard.$(WalletAddressPage.HANDLE_IMAGE).$('img'));
  }
}

export default new WalletAddressPageAssert();
