/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { ChainablePromiseElement } from 'webdriverio';
import testContext from '../../utils/testContext';
import { browser } from '@wdio/globals';
import { scrollDownWithOffset } from '../../utils/scrollUtils';
import NftsCommon from './nftsCommon';

class NftsPage {
  public LIST_CONTAINER = '[data-testid="nft-list-container"]';
  private CREATE_FOLDER_BUTTON = '[data-testid="create-folder-button"]';
  private NFT_SEARCH_INPUT = '[data-testid="nft-search-input"]';
  public NFT_CONTAINER = '[data-testid="nft-item"]';
  public NFT_IMAGE = '[data-testid="nft-image"]';
  public NFT_NAME = '[data-testid="nft-item-name"]';
  protected FOLDER_CONTAINER = '[data-testid="folder-item"]';
  public NFT_ITEM_IMG_CONTAINER = '[data-testid="nft-item-img-container"]';
  public REST_OF_NFTS = '[data-testid="rest-of-nfts"]';

  get title(): typeof SectionTitle.sectionTitle {
    return SectionTitle.sectionTitle;
  }

  get counter(): typeof SectionTitle.sectionCounter {
    return SectionTitle.sectionCounter;
  }

  get listContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LIST_CONTAINER);
  }

  get nftContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NFT_CONTAINER);
  }

  get createFolderButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_FOLDER_BUTTON);
  }

  get nftSearchInput(): ChainablePromiseElement<WebdriverIO.Element> {
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

  async clickNftItem(nftName: string, clickType: 'left' | 'right' = 'left') {
    await this.waitForNft(nftName);
    const nftNameElement = await this.getNftName(nftName);
    await nftNameElement.waitForStable();
    await nftNameElement.click({ button: clickType });
  }

  async isNftDisplayed(nftName: string): Promise<boolean> {
    await this.nftContainer.waitForDisplayed({ timeout: 15_000 });
    const nftItem = await this.getNftContainer(nftName);
    return nftItem !== undefined;
  }

  async saveNfts(): Promise<any> {
    const ownedNfts = await NftsCommon.getAllNftNamesWithScroll(`${this.LIST_CONTAINER} ${this.NFT_NAME}`);
    testContext.save('ownedNfts', ownedNfts);
  }

  async waitForNft(nftName: string) {
    await browser.waitUntil(
      async () => {
        const nft = await this.getNftContainer(nftName);

        if (nft !== undefined) {
          return true;
        }

        await scrollDownWithOffset(await this.nftContainers);
        return false;
      },
      {
        timeout: 3000,
        timeoutMsg: `Failed while waiting for NFT: ${nftName}`
      }
    );
  }
}

export default new NftsPage();
