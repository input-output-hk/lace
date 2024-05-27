/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class NftsPage {
  protected LIST_CONTAINER = '[data-testid="nft-list-container"]';
  private CREATE_FOLDER_BUTTON = '[data-testid="create-folder-button"]';
  private NFT_SEARCH_INPUT = '[data-testid="nft-search-input"]';
  protected NFT_CONTAINER = '[data-testid="nft-item"]';
  public NFT_IMAGE = '[data-testid="nft-image"]';
  public NFT_NAME = '[data-testid="nft-item-name"]';
  protected FOLDER_CONTAINER = '[data-testid="folder-item"]';
  public NFT_ITEM_IMG_CONTAINER = '[data-testid="nft-item-img-container"]';
  public REST_OF_NFTS = '[data-testid="rest-of-nfts"]';

  get title() {
    return SectionTitle.sectionTitle;
  }

  get counter() {
    return SectionTitle.sectionCounter;
  }

  get listContainer() {
    return $(this.LIST_CONTAINER);
  }

  get nftContainer() {
    return $(this.NFT_CONTAINER);
  }

  get createFolderButton() {
    return $(this.CREATE_FOLDER_BUTTON);
  }

  get nftSearchInput() {
    return $(this.NFT_SEARCH_INPUT);
  }

  get nftContainers(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.listContainer.$$(this.NFT_CONTAINER);
  }

  get folderContainers(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.listContainer.$$(this.FOLDER_CONTAINER);
  }

  async getNftContainer(name: string): Promise<WebdriverIO.Element> {
    return (await this.nftContainers.find(
      async (item) => (await item.$(this.NFT_NAME).getText()) === name
    )) as WebdriverIO.Element;
  }

  async getNftImage(name: string): Promise<WebdriverIO.Element> {
    const nftContainer = await this.getNftContainer(name);
    return nftContainer.$(this.NFT_IMAGE);
  }

  async getNftName(name: string): Promise<WebdriverIO.Element> {
    const nftContainer = await this.getNftContainer(name);
    return nftContainer.$(this.NFT_NAME);
  }

  async getFolder(name: string): Promise<WebdriverIO.Element> {
    return (await this.folderContainers.find(
      async (item) => (await item.$(this.NFT_NAME).getText()) === name
    )) as WebdriverIO.Element;
  }
}

export default new NftsPage();
