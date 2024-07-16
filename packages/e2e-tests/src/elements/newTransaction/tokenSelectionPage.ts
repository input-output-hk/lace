/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';
import { generateRandomString } from '../../utils/textUtils';
import { TokenSearchResult } from './tokenSearchResult';

class TokenSelectionPage extends CommonDrawerElements {
  private TOKENS_BUTTON = '//input[@data-testid="asset-selector-button-tokens"]';
  private TOKEN_ROW = '//div[@data-testid="coin-search-row"]';
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
  private SEARCH_INPUT = '[data-testid="asset-selector"] [data-testid="search-input"]';
  public NFT_IMAGE = '[data-testid="nft-image"]';

  get tokensButton() {
    return $(this.TOKENS_BUTTON).parentElement().parentElement();
  }

  get nftsButton() {
    return $(this.NFTS_BUTTON).parentElement().parentElement();
  }

  get searchInput() {
    return $(this.SEARCH_INPUT);
  }

  get nftImages() {
    return this.assetSelectorContainer.$$(this.NFT_IMAGE);
  }

  get tokens() {
    return $$(this.TOKEN_ROW);
  }

  tokenItem(nameOrIndex: string | number) {
    return new TokenSearchResult(nameOrIndex);
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
    await nftNameElement.waitForClickable();
    await nftNameElement.click();
  };

  clickTokensButton = async () => {
    await this.tokensButton.waitForClickable();
    await this.tokensButton.click();
  };

  clickNFTsButton = async () => {
    await this.nftsButton.waitForClickable();
    await this.nftsButton.click();
  };

  addAmountOfAssets = async (amount: number, assetType: string) => {
    for (let i = 1; i <= amount; i++) {
      assetType === 'Tokens' ? await this.tokenItem(i).container.click() : await this.nftNames[i].click();
    }
  };

  deselectToken = async (assetType: string, index: number) => {
    assetType === 'Tokens' ? await this.tokenItem(Number(index)).container.click() : await this.nftNames[index].click();
  };

  saveSelectedTokens = async (assetType: string, bundle: number) => {
    const amountOfAssets = Number(await this.assetsCounter.getText());
    testContext.save(`amountOfAssetsInBundle${String(bundle)}`, amountOfAssets);

    for (let i = 1; i <= amountOfAssets; i++) {
      if (assetType === 'Tokens') {
        const tokenName = String(await this.tokenItem(i).name.getText()).slice(0, 6);
        const asset =
          tokenName === 'asset1'
            ? String(await this.tokenItem(i).name.getText()).slice(0, 10)
            : String(await this.tokenItem(i).ticker.getText()).slice(0, 10);
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
        assetName.slice(0, 6) === 'asset1' ? assetName.slice(0, 10) : await this.tokenItem(assetName).ticker.getText();
    }
    testContext.save('savedTicker', String(assetName));
  };

  getTokensInfo = async () => {
    const tokenInfo = [];
    const numberOfTokens = await this.tokens.length;
    for (let tokenIndex = 1; tokenIndex <= numberOfTokens; tokenIndex++) {
      const token = this.tokenItem(tokenIndex);
      const tokenDetails = { name: await token.name.getText(), ticker: await token.ticker.getText() };
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

  searchAsset = async (assetName: string) => {
    if (assetName === 'random characters') {
      assetName = await generateRandomString(10);
    }
    await this.searchInput.setValue(assetName);
  };

  clickOnToken = async (tokenName: string) => {
    await this.tokenItem(tokenName).container.click();
  };
}

export default new TokenSelectionPage();
