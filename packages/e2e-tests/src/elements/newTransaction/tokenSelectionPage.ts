/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';

class TokenSelectionPage extends CommonDrawerElements {
  private TOKENS_BUTTON = '//input[@data-testid="asset-selector-button-tokens"]';
  private TOKEN_ROW = '//div[@data-testid="coin-search-row"]';
  private TOKEN_INFO = '//div[@data-testid="coin-search-row-info"]';
  private TOKEN_ICON = '//div[@data-testid="coin-search-row-icon"]';
  private NFTS_BUTTON = '//input[@data-testid="asset-selector-button-nfts"]';
  private ASSET_SELECTOR_CONTAINER = '//div[@data-testid="asset-selector"]';
  private NFT_CONTAINER = '[data-testid="nft-item"]';
  private NFT_ITEM_NAME = '[data-testid="nft-item-name"]';
  private NFT_ITEM_OVERLAY = '[data-testid="nft-item-overlay"]';
  private NFT_ITEM_SELECTED_CHECKMARK = '[data-testid="nft-item-selected"]';
  private ASSETS_SELECTION_COUNTER = '//div[@data-testid="assets-counter"]';
  private NEUTRAL_FACE_ICON = '[data-testid="neutral-face-icon"]';
  private SAD_FACE_ICON = '[data-testid="sad-face-icon"]';
  private EMPTY_STATE_MESSAGE = '[data-testid="asset-list-empty-state-message"]';
  private CANCEL_BUTTON = '[data-testid="cancel-button"]';
  private CLEAR_BUTTON = '[data-testid="clear-button"]';
  private SELECT_MULTIPLE_BUTTON = '[data-testid="select-multiple-button"]';
  private ADD_TO_TRANSACTION_BUTTON = '[data-testid="add-to-transaction-button"]';
  public NFT_IMAGE = '[data-testid="nft-image"]';

  get tokensButton() {
    return $(this.TOKENS_BUTTON).parentElement().parentElement();
  }

  get nftImages() {
    return this.assetSelectorContainer.$$(this.NFT_IMAGE);
  }

  get tokens() {
    return $$(this.TOKEN_ROW);
  }

  tokenItemInfo(index: number) {
    return $(`(${this.TOKEN_INFO})[${index}]`);
  }

  tokenName(index: number) {
    return $(String(`(${this.TOKEN_ROW})[${index}]//h6`));
  }

  tokenTicker(index: number) {
    return $(String(`(${this.TOKEN_ROW})[${index}]//p`));
  }

  tokenTickerFromName(assetName: string) {
    return $(String(`${this.TOKEN_ROW}//h6[text() = '${assetName}']/following-sibling::p`));
  }

  grayedOutTokenIcon(index: number) {
    return $(String(`(${this.TOKEN_ICON})[${index}]//div[contains(@class, 'overlay')]`));
  }

  checkmarkInSelectedToken(index: number) {
    return $(String(`(${this.TOKEN_ICON})[${index}]//*[name()='svg']`));
  }

  get nftsButton() {
    return $(this.NFTS_BUTTON).parentElement().parentElement();
  }

  get assetSelectorContainer() {
    return $(this.ASSET_SELECTOR_CONTAINER);
  }

  get nftItemSelectedCheckmark() {
    return $(this.NFT_ITEM_SELECTED_CHECKMARK);
  }

  get nftContainers() {
    return this.assetSelectorContainer.$$(this.NFT_CONTAINER);
  }

  get nftNames() {
    return this.assetSelectorContainer.$$(this.NFT_ITEM_NAME);
  }

  getNftContainer = async (name: string) =>
    (await this.nftContainers.find(
      async (item) => (await item.$(this.NFT_ITEM_NAME).getText()) === name
    )) as WebdriverIO.Element;

  getNftName = async (name: string) => {
    const nftContainer = await this.getNftContainer(name);
    return nftContainer.$(this.NFT_ITEM_NAME);
  };

  grayedOutNFT(index: number) {
    return this.nftContainers[index].$(this.NFT_ITEM_OVERLAY);
  }

  checkmarkInSelectedNFT(index: number) {
    return this.nftContainers[index].$(this.NFT_ITEM_SELECTED_CHECKMARK);
  }

  get assetsCounter() {
    return $(this.ASSETS_SELECTION_COUNTER);
  }

  get neutralFaceIcon() {
    return $(this.NEUTRAL_FACE_ICON);
  }

  get sadFaceIcon() {
    return $(this.SAD_FACE_ICON);
  }

  get emptyStateMessage() {
    return $(this.EMPTY_STATE_MESSAGE);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  get clearButton() {
    return $(this.CLEAR_BUTTON);
  }

  get selectMultipleButton() {
    return $(this.SELECT_MULTIPLE_BUTTON);
  }

  get addToTransactionButton() {
    return $(this.ADD_TO_TRANSACTION_BUTTON);
  }

  clickNftItemInAssetSelector = async (nftName: string) => {
    const nftNameElement = await this.getNftName(nftName);
    await nftNameElement.click();
  };

  clickTokensButton = async () => {
    await this.tokensButton.click();
  };

  clickNFTsButton = async () => {
    await this.nftsButton.click();
  };

  addAmountOfAssets = async (amount: number, assetType: string) => {
    for (let i = 1; i <= amount; i++) {
      assetType === 'Tokens' ? await this.tokenItemInfo(i).click() : await this.nftNames[i].click();
    }
  };

  deselectToken = async (assetType: string, index: number) => {
    assetType === 'Tokens' ? await this.tokenItemInfo(index).click() : await this.nftNames[index].click();
  };

  saveSelectedTokens = async (assetType: string, bundle: number) => {
    const amountOfAssets = Number(await this.assetsCounter.getText());
    testContext.save(`amountOfAssetsInBundle${String(bundle)}`, amountOfAssets);

    for (let i = 1; i <= amountOfAssets; i++) {
      if (assetType === 'Tokens') {
        const tokenName = String(await this.tokenName(i).getText()).slice(0, 6);
        const asset =
          tokenName === 'asset1'
            ? String(await this.tokenName(i).getText()).slice(0, 10)
            : String(await this.tokenTicker(i).getText()).slice(0, 10);
        testContext.save(`bundle${String(bundle)}asset${String(i)}`, asset);
      } else {
        const asset = String(await this.nftNames[i].getText()).slice(0, 10);
        testContext.save(`bundle${String(bundle)}asset${String(i)}`, asset);
      }
    }
  };

  saveTicker = async (assetType: string, assetName: string) => {
    if (assetType === 'Token') {
      assetName =
        assetName.slice(0, 6) === 'asset1'
          ? assetName.slice(0, 10)
          : String(await this.tokenTickerFromName(assetName).getText());
    }
    testContext.save('savedTicker', String(assetName));
  };

  getTokensInfo = async () => {
    const tokenInfo = [];
    const numberOfTokens = await this.tokens.length;
    for (let tokenIndex = 1; tokenIndex <= numberOfTokens; tokenIndex++) {
      const tokenDetailsText = await this.tokenItemInfo(tokenIndex).getText();
      const tokenDetailsArray = tokenDetailsText.split('\n');
      const tokenDetails = { name: tokenDetailsArray[0], ticker: tokenDetailsArray[1] };
      tokenInfo.push(tokenDetails);
    }
    return tokenInfo;
  };

  getNftNames = async () => {
    const nftInfo = [];
    const numberOfNFTs = await this.nftNames.length;
    for (let i = 0; i < numberOfNFTs; i++) {
      nftInfo.push(await this.nftNames[i].getText());
    }
    return nftInfo;
  };
}

export default new TokenSelectionPage();
