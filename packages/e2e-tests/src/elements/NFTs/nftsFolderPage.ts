/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';

class NftsFolderPage extends CommonDrawerElements {
  private FOLDER_TITLE = '[data-testid="selected-folder-title"]';
  private FOLDER_NFT_COUNT = '[data-testid="selected-folder-nft-counter"]';
  private ADD_NFT_BUTTON = '[data-testid="placeholder-item"]';
  private ASSET_SELECTOR_CONTAINER = '[data-testid="asset-selector-wrapper"]';
  public NFT_CONTAINER = '[data-testid="nft-item"]';
  public NFT_NAME = '[data-testid="nft-item-name"]';
  public NFT_IMAGE = '[data-testid="nft-image"]';

  get title() {
    return $(this.FOLDER_TITLE);
  }

  get nftCounter() {
    return $(this.FOLDER_NFT_COUNT);
  }

  get addNftButton() {
    return $(this.ADD_NFT_BUTTON);
  }

  get assetSelectorContainer() {
    return $(this.ASSET_SELECTOR_CONTAINER);
  }

  get nfts() {
    return this.assetSelectorContainer.$$(this.NFT_CONTAINER);
  }

  async getNft(nftName: string) {
    return (await this.nfts.find(
      async (nft) => (await nft.$(this.NFT_NAME).getText()) === nftName
    )) as WebdriverIO.Element;
  }

  async clickAddNftButton() {
    await this.addNftButton.waitForClickable();
    await this.addNftButton.click();
  }
}

export default new NftsFolderPage();
