/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';

class NftDetails {
  private NFT_DETAILS_DRAWER = '[data-testid="nft-details-drawer"]';
  private IMAGE = '[data-testid="nft-image"]';
  private SET_AS_AVATAR_BUTTON = '[data-testid="nft-set-as-avatar-button"]';
  private TOKEN_INFO_SECTION = '[data-testid="nft-info"]';
  private TOKEN_INFORMATION_LABEL = '[data-testid="nft-info-label"]';
  private ATTRIBUTES_SECTION = '[data-testid="nft-attributes"]';
  private ATTRIBUTES_LABEL = '[data-testid="nft-attributes-label"]';
  private INFO_LIST_ITEM = '[data-testid="info-list-item"]';
  private INFO_LIST_ITEM_KEY = '[data-testid="info-list-item-key"]';
  private INFO_LIST_ITEM_VALUE = '[data-testid="info-list-item-value"]';
  private SEND_NFT_BUTTON = '#send-nft-btn';
  private NFT_TITLE_ON_POPUP = '[data-testid="drawer-content"] h2';

  get drawerBody(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NFT_DETAILS_DRAWER);
  }

  get drawerNavigationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.drawerBody.$(new CommonDrawerElements().DRAWER_NAVIGATION_TITLE);
  }

  get drawerHeaderTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.drawerBody.$(new CommonDrawerElements().DRAWER_HEADER_TITLE);
  }

  get drawerHeaderBackButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.drawerBody.$(new CommonDrawerElements().DRAWER_HEADER_BACK_BUTTON);
  }

  get drawerHeaderCloseButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.drawerBody.$(new CommonDrawerElements().DRAWER_HEADER_CLOSE_BUTTON);
  }

  get nftTitleOnPopup() {
    return $(this.NFT_TITLE_ON_POPUP);
  }

  get image() {
    return this.drawerBody.$(this.IMAGE);
  }

  get setAsAvatarButton() {
    return this.drawerBody.$(this.SET_AS_AVATAR_BUTTON);
  }

  get tokenInfoSection() {
    return $(this.TOKEN_INFO_SECTION);
  }

  get tokenInfoSectionTitle() {
    return this.drawerBody.$(this.TOKEN_INFORMATION_LABEL);
  }

  get policyIdLabel() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[0].$(this.INFO_LIST_ITEM_KEY);
  }

  get policyIdValue() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[0].$(this.INFO_LIST_ITEM_VALUE);
  }

  get assetIdLabel() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[1].$(this.INFO_LIST_ITEM_KEY);
  }

  get assetIdValue() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[1].$(this.INFO_LIST_ITEM_VALUE);
  }

  get mediaUrlLabel() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[2].$(this.INFO_LIST_ITEM_KEY);
  }

  get mediaUrlValue() {
    return this.tokenInfoSection.$$(this.INFO_LIST_ITEM)[2].$(this.INFO_LIST_ITEM_VALUE);
  }

  get attributesSectionTitle() {
    return this.drawerBody.$(this.ATTRIBUTES_LABEL);
  }

  get attributesSection() {
    return $(this.ATTRIBUTES_SECTION);
  }

  get sendNFTButton() {
    return $(this.SEND_NFT_BUTTON);
  }

  async saveNFTDetails(): Promise<any> {
    const policyId = await this.policyIdValue.getText();
    const assetId = await this.assetIdValue.getText();
    const mediaUrl = await this.mediaUrlValue.getText();
    testContext.save('nftDetails', { policyId, assetId, mediaUrl });
  }

  async loadNFTDetails(): Promise<any> {
    return testContext.load('nftDetails');
  }
}

export default new NftDetails();
