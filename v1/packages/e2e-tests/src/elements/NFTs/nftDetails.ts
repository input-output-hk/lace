/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';

class NftDetails {
  private NFT_DETAILS_DRAWER = '[data-testid="nft-details-drawer"]';
  private IMAGE = '[data-testid="nft-image"]';
  private SET_AS_AVATAR_BUTTON = '[data-testid="nft-set-as-avatar-button"]';
  private PRINT_THIS_NFT_BUTTON = '[data-testid="nft-print-button"]';
  private TOKEN_INFO_SECTION = '[data-testid="nft-info"]';
  private TOKEN_INFORMATION_LABEL = '[data-testid="nft-info-label"]';
  private ATTRIBUTES_SECTION = '[data-testid="nft-attributes"]';
  private ATTRIBUTES_LABEL = '[data-testid="nft-attributes-label"]';
  private INFO_LIST_ITEM = '[data-testid="info-list-item"]';
  private INFO_LIST_ITEM_KEY = '[data-testid="info-list-item-key"]';
  private INFO_LIST_ITEM_VALUE = '[data-testid="info-list-item-value"]';
  private FOLDER_PATH_PART_1 = '[data-testid="folder-path-1"]';
  private FOLDER_PATH_PART_2 = '[data-testid="folder-path-2"] [data-testid="ellipsis-text"]';
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

  get nftTitleOnPopup(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NFT_TITLE_ON_POPUP);
  }

  get image() {
    return this.drawerBody.$(this.IMAGE);
  }

  get setAsAvatarButton() {
    return this.drawerBody.$(this.SET_AS_AVATAR_BUTTON);
  }

  get printThisNftButton() {
    return this.drawerBody.$(this.PRINT_THIS_NFT_BUTTON);
  }

  get tokenInfoSection(): ChainablePromiseElement<WebdriverIO.Element> {
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

  get folderPathPart1() {
    return this.tokenInfoSection.$(this.FOLDER_PATH_PART_1);
  }

  get folderPathPart2() {
    return this.tokenInfoSection.$(this.FOLDER_PATH_PART_2);
  }

  get attributesSectionTitle() {
    return this.drawerBody.$(this.ATTRIBUTES_LABEL);
  }

  get attributesSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ATTRIBUTES_SECTION);
  }

  get sendNFTButton(): ChainablePromiseElement<WebdriverIO.Element> {
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

  async getFolderPath(): Promise<string> {
    await this.folderPathPart1.waitUntil(async () => (await this.folderPathPart1.getText()) !== '');
    const folderPathText1 = await this.folderPathPart1.getText();
    if (await this.folderPathPart2.isDisplayed()) {
      const folderPathText2 = await this.folderPathPart2.getText();
      return `${folderPathText1}/${folderPathText2}`;
    }
    return folderPathText1;
  }

  async clickOnSendNFTButton(): Promise<void> {
    await this.sendNFTButton.waitForStable();
    await this.sendNFTButton.click();
  }

  async clickOnSetAsAvatarButton(): Promise<void> {
    await this.setAsAvatarButton.waitForStable();
    await this.setAsAvatarButton.click();
  }

  async clickOnPrintThisNFTButton(): Promise<void> {
    await this.printThisNftButton.waitForStable();
    await this.printThisNftButton.click();
  }
}

export default new NftDetails();
