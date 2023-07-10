/* eslint-disable no-undef */
import { ChainablePromiseArray } from 'webdriverio/build/types';

class NftItem {
  protected NFT_CONTAINER = '[data-testid="nft-item"]';
  private NFT_IMAGE = '[data-testid="nft-image"]';
  private NFT_NAME = '[data-testid="nft-item-name"]';
  private SELECTED_CHECKMARK = '[data-testid="nft-item-selected"]';

  get nftContainer() {
    return $(this.NFT_CONTAINER);
  }

  get image() {
    return $(this.NFT_IMAGE);
  }

  get name() {
    return $(this.NFT_NAME);
  }

  get selectedCheckmark() {
    return $(this.SELECTED_CHECKMARK);
  }

  get containers(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.NFT_CONTAINER);
  }

  async getNftByName(name: string): Promise<WebdriverIO.Element> {
    return (await this.containers.find(
      async (item) => (await item.$(this.NFT_NAME).getText()) === name
    )) as WebdriverIO.Element;
  }

  async getNftImageByName(name: string): Promise<WebdriverIO.Element> {
    const nftContainer = await this.getNftByName(name);
    return nftContainer.$(this.NFT_IMAGE);
  }

  async getNftNameByName(name: string): Promise<WebdriverIO.Element> {
    const nftContainer = await this.getNftByName(name);
    return nftContainer.$(this.NFT_NAME);
  }
}

export default new NftItem();
