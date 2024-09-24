import WalletAddressPage from '../elements/walletAddressPage';
import { Account, getTestWallet, WalletConfig, WalletRepositoryConfig } from '../support/walletConfiguration';
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

      await WalletAddressPage.advancedModeToggleLabel.waitForDisplayed();
      expect(await WalletAddressPage.advancedModeToggleLabel.getText()).to.equal(
        await t('qrInfo.advancedMode.toggle.label')
      );
      await WalletAddressPage.advancedModeToggleIcon.waitForDisplayed();
      await WalletAddressPage.advancedModeToggleSwitch.waitForDisplayed();
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

  async assertSeeAdvancedModeToggleState(expectedState: 'checked' | 'unchecked') {
    const currentState = await WalletAddressPage.advancedModeToggleSwitch.getAttribute('data-state');
    expect(currentState).to.equal(expectedState);
  }

  async assertSeeMainAddressCardInAdvancedMode(testWalletName: string) {
    const card = (await WalletAddressPage.addressCards)[0];

    const qrCodeElement = await card.$(WalletAddressPage.QR_CODE);
    await qrCodeElement.waitForDisplayed();

    const titleElement = await card.$(WalletAddressPage.ADDRESS_CARD_TITLE);
    await titleElement.waitForDisplayed();
    expect(await titleElement.getText()).to.equal(await t('qrInfo.advancedMode.tags.main'));

    const walletData = getTestWallet(testWalletName);
    const expectedAddress = String(extensionUtils.isMainnet() ? walletData.mainnetAddress : walletData.address);

    const addressElement = await card.$(WalletAddressPage.WALLET_ADDRESS);
    await addressElement.waitForDisplayed();
    expect(await addressElement.getText()).to.equal(expectedAddress);

    const addressAssets = await card.$(WalletAddressPage.ADDRESS_ASSETS);
    await addressAssets.waitForDisplayed();

    const addressAdaIcon = await card.$(WalletAddressPage.ADDRESS_ADA_ICON);
    await addressAdaIcon.waitForDisplayed();

    const addressAdaValue = await card.$(WalletAddressPage.ADDRESS_ADA_VALUE);
    await addressAdaValue.waitForDisplayed();
    expect(await addressAdaValue.getText()).not.to.be.empty;

    const addressTokensIcon = await card.$(WalletAddressPage.ADDRESS_TOKENS_ICON);
    await addressTokensIcon.waitForDisplayed();

    const addressTokensCount = await card.$(WalletAddressPage.ADDRESS_TOKENS_COUNT);
    await addressTokensCount.waitForDisplayed();
    expect(await addressTokensCount.getText()).not.to.be.empty;

    const addressTokensChevron = card.$(WalletAddressPage.ADDRESS_TOKENS_CHEVRON);
    await addressTokensChevron.waitForDisplayed();
  }

  async assertSeeAdditionalAddressesDivider() {
    await WalletAddressPage.additionalAddressesDivider.waitForDisplayed();
    expect(await WalletAddressPage.additionalAddressesDivider.getText()).to.equal(
      await t('qrInfo.advancedMode.additionalAddresses.title')
    );
  }

  async assertSeeAddressCardsWithNoAda(addresses: string[]) {
    const addressCards = await WalletAddressPage.addressCards;

    for (const [i, address] of addresses.entries()) {
      const addressCard = addressCards[i + 1]; // skip card 0 because it's a main address

      const qrCodeElement = await addressCard.$(WalletAddressPage.QR_CODE);
      await qrCodeElement.waitForDisplayed();

      const addressElement = await addressCard.$(WalletAddressPage.WALLET_ADDRESS);
      await addressElement.waitForDisplayed();
      expect(await addressElement.getText()).to.equal(address);

      const addressAdaIcon = await addressCard.$(WalletAddressPage.ADDRESS_ADA_ICON);
      await addressAdaIcon.waitForDisplayed();

      const addressAdaValue = await addressCard.$(WalletAddressPage.ADDRESS_ADA_VALUE);
      await addressAdaValue.waitForDisplayed();
      expect(await addressAdaValue.getText()).to.equal('0');
    }
  }

  async assertSeeUnusedAddressCard(shouldSee: boolean, expectedUnusedAddress?: string) {
    const addressCards = await WalletAddressPage.addressCards;
    const unusedAddressCard = addressCards[addressCards.length - 1]; // it should always be the last one

    const qrCodeElement = await unusedAddressCard.$(WalletAddressPage.QR_CODE);
    await qrCodeElement.waitForDisplayed();

    const addressElement = await unusedAddressCard.$(WalletAddressPage.WALLET_ADDRESS);
    await addressElement.waitForDisplayed();
    if (expectedUnusedAddress) {
      expect(await addressElement.getText()).to.equal(expectedUnusedAddress);
    } else {
      expect(await addressElement.getText()).not.to.be.empty;
    }

    if (shouldSee) {
      const titleElement = await unusedAddressCard.$(WalletAddressPage.ADDRESS_CARD_TITLE);
      await titleElement.waitForDisplayed();
      expect(await titleElement.getText()).to.equal(await t('qrInfo.advancedMode.tags.unused'));

      const titleIconElement = await unusedAddressCard.$(WalletAddressPage.ADDRESS_CARD_TITLE_INFO_ICON);
      await titleIconElement.waitForDisplayed();
      const unusedAddressIcon = await unusedAddressCard.$(WalletAddressPage.UNUSED_ADDRESS_INFO_ICON);
      await unusedAddressIcon.waitForDisplayed();

      const unusedAddressLabel = await unusedAddressCard.$(WalletAddressPage.UNUSED_ADDRESS_INFO_LABEL);
      await unusedAddressLabel.waitForDisplayed();
      expect(await unusedAddressLabel.getText()).to.equal(await t('core.addressCard.unused.label'));
    } else {
      await unusedAddressCard.$(WalletAddressPage.ADDRESS_CARD_TITLE).waitForDisplayed({ reverse: true });
      await unusedAddressCard.$(WalletAddressPage.ADDRESS_CARD_TITLE_INFO_ICON).waitForDisplayed({ reverse: true });
      await unusedAddressCard.$(WalletAddressPage.UNUSED_ADDRESS_INFO_ICON).waitForDisplayed({ reverse: true });
      await unusedAddressCard.$(WalletAddressPage.UNUSED_ADDRESS_INFO_LABEL).waitForDisplayed({ reverse: true });
    }
  }

  async assertSeeAddNewAddressBanner() {
    await WalletAddressPage.addNewAddressBanner.container.waitForDisplayed();
    await WalletAddressPage.addNewAddressBanner.icon.waitForDisplayed();
    await WalletAddressPage.addNewAddressBanner.description.waitForDisplayed();
    expect(await WalletAddressPage.addNewAddressBanner.description.getText()).to.equal(
      await t('qrInfo.advancedMode.newAddress.warning')
    );
  }

  async assertSeeAddNewAddressButton(expectedState: 'enabled' | 'disabled') {
    if (expectedState === 'enabled') {
      const enabled = await WalletAddressPage.addNewAddressButton.getAttribute('enabled');
      const disabled = await WalletAddressPage.addNewAddressButton.getAttribute('disabled');
      expect(enabled).to.be.null;
      expect(disabled).to.be.null;
    } else {
      const disabled = await WalletAddressPage.addNewAddressButton.getAttribute('disabled');
      expect(disabled).to.equal('true');
    }
  }

  async assertSeeWalletNameAndAddress(wallet: WalletConfig, mode: 'extended' | 'popup') {
    expect(await WalletAddressPage.walletName.getText()).to.equal(wallet.name);
    const address = String(extensionUtils.isMainnet() ? wallet.mainnetAddress : wallet.address);
    const expectedAddress = mode === 'extended' ? address : `${address.slice(0, 7)}...${address.slice(-8)}`;
    expect(await WalletAddressPage.walletAddress.getText()).to.equal(expectedAddress);
  }

  async assertSeeWalletNameAccountAndAddress(
    wallet: WalletRepositoryConfig,
    accountNumber: number,
    mode: 'extended' | 'popup'
  ) {
    expect(await WalletAddressPage.walletName.getText()).to.equal(wallet.name);
    let account: Account;
    if (wallet.accounts) {
      account = wallet.accounts[accountNumber];
      const address = String(extensionUtils.isMainnet() ? account.mainnetAddress : account.address);
      const expectedAddress = mode === 'extended' ? address : `${address.slice(0, 7)}...${address.slice(-8)}`;
      expect(await WalletAddressPage.walletAddress.getText()).to.equal(expectedAddress);
    } else {
      throw new Error(`Account: ${accountNumber} not found`);
    }
  }

  async assertSeeAdaHandleAddressCard() {
    const handleNames: string[] = [];
    const handleImageSrcs: string[] = [];
    const handleNameElements = await WalletAddressPage.handleNames;
    await handleNameElements[0].waitForStable();

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

  async assertDisplayedUnusedAddressIsDifferentThanSaved() {
    const savedAddress = WalletAddressPage.getSavedLastAddress();
    const lastCardAddress = WalletAddressPage.getLastAddress();
    expect(savedAddress).does.not.equal(lastCardAddress);
  }

  async assertSeeCopyButtonOnAddressCard(index: number) {
    await (await WalletAddressPage.addressCards)[index].$(WalletAddressPage.COPY_BUTTON).waitForDisplayed();
  }

  async assertSeeAdvancedModeToggleTooltip() {
    await WalletAddressPage.tooltip.waitForDisplayed();
    expect(await WalletAddressPage.tooltip.getText()).to.equal(await t('qrInfo.advancedMode.toggle.description'));
  }

  async assertSeeSavedUnusedAddressCardPenultimate() {
    const addressCards = await WalletAddressPage.addressCards;
    const penultimateCardAddress = await (
      await addressCards[addressCards.length - 2].$(WalletAddressPage.WALLET_ADDRESS)
    ).getText();
    const savedAddress = await WalletAddressPage.getSavedLastAddress();
    expect(penultimateCardAddress).to.equal(savedAddress);
  }
}

export default new WalletAddressPageAssert();
