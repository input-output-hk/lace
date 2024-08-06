/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import SearchInput from '../searchInput';
import { browser } from '@wdio/globals';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { ChainablePromiseElement } from 'webdriverio';

class NftSelectNftsPage extends CommonDrawerElements {
  private COUNTER = '[data-testid="assets-counter"]';
  private CLEAR_BUTTON = '[data-testid="assets-clear"]';
  private NEXT_BUTTON = '[data-testid="create-folder-drawer-asset-picker-cta"]';
  private ASSET_SELECTOR_CONTAINER = '[data-testid="asset-selector-wrapper"]';
  private SAD_FACE_ICON = '[data-testid="sad-face-icon"]';
  private EMPTY_STATE_MESSAGE = '[data-testid="asset-list-empty-state-message"]';
  private NFT_CONTAINER = '[data-testid="nft-item"]';
  private NFT_NAME = '[data-testid="nft-item-name"]';
  public NFT_IMAGE = '[data-testid="nft-image"]';
  public NFT_ITEM_SELECTED_CHECKMARK = '[data-testid="nft-item-selected"]';

  get counter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COUNTER);
  }

  get clearButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLEAR_BUTTON);
  }

  get searchInput(): typeof SearchInput {
    return SearchInput;
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  get assetSelectorContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ASSET_SELECTOR_CONTAINER);
  }

  get sadFaceIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SAD_FACE_ICON);
  }

  get noResultsMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_MESSAGE);
  }

  get nfts(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.assetSelectorContainer.$$(this.NFT_CONTAINER);
  }

  async enterSearchPhrase(searchPhrase: string) {
    await this.searchInput.input.waitForClickable();
    await this.searchInput.input.setValue(searchPhrase);
  }

  async getNftByName(nftName: string) {
    return (await this.nfts.find(
      async (nft) => (await nft.$(this.NFT_NAME).getText()) === nftName
    )) as WebdriverIO.Element;
  }

  async waitForNft(nftName: string) {
    await browser.waitUntil(async () => (await this.getNftByName(nftName)) !== undefined, {
      timeout: 3000,
      timeoutMsg: `failed while waiting for nft: ${nftName}`
    });
  }

  async selectNFTs(numberOfNFTs: number) {
    for (let i = 0; i < numberOfNFTs; i++) {
      await this.nfts[i].waitForClickable();
      await this.nfts[i].click();
    }
  }

  async clearSearchBarInput() {
    await this.searchInput.clearButton.waitForClickable();
    await this.searchInput.clearButton.click();
  }

  async clickNextButton() {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }
}

export default new NftSelectNftsPage();
