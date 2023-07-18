/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import SearchInput from '../searchInput';

class NftSelectNftsPage extends CommonDrawerElements {
  private COUNTER = '[data-testid="assets-counter"]';
  private CLEAR_BUTTON = '[data-testid="assets-clear"]';
  private NEXT_BUTTON = '[data-testid="create-folder-drawer-asset-picker-cta"]';
  private ASSET_SELECTOR_CONTAINER = '[data-testid="asset-selector-wrapper"]';
  private SAD_FACE_ICON = '[data-testid="sad-face-icon"]';
  private EMPTY_STATE_MESSAGE = '[data-testid="asset-list-empty-state-message"]';
  private NFT_CONTAINER = '[data-testid="nft-item"]';
  private NFT_NAME = '[data-testid="nft-item-name"]';
  public NFT_ITEM_SELECTED_CHECKMARK = '[data-testid="nft-item-selected"]';

  get counter() {
    return $(this.COUNTER);
  }

  get clearButton() {
    return $(this.CLEAR_BUTTON);
  }

  get searchInput(): typeof SearchInput {
    return SearchInput;
  }

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get assetSelectorContainer() {
    return $(this.ASSET_SELECTOR_CONTAINER);
  }

  get sadFaceIcon() {
    return $(this.SAD_FACE_ICON);
  }

  get noResultsMessage() {
    return $(this.EMPTY_STATE_MESSAGE);
  }

  get nfts() {
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

  async selectNFTs(numberOfNFTs: number) {
    for (let i = 0; i < numberOfNFTs; i++) {
      await this.nfts[i].waitForClickable();
      await this.nfts[i].click();
    }
  }
}

export default new NftSelectNftsPage();
