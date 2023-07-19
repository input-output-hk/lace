/* eslint-disable no-undef */
import { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { DrawerCommonExtended } from '../drawerCommonExtended';
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';

export class TokenSelectionPage extends WebElement {
  protected CONTAINER;
  private TOKENS_BUTTON = '//input[@data-testid="asset-selector-button-tokens"]';
  private TOKEN_ROW = '//div[@data-testid="coin-search-row-info"]';
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

  constructor() {
    super();
    this.CONTAINER = new DrawerCommonExtended().container().toJSLocator();
  }

  get tokensButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOKENS_BUTTON).parentElement().parentElement();
  }

  tokenItem(): WebElement {
    return Factory.fromSelector(`${this.TOKEN_ROW}`, 'xpath');
  }

  tokenName(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKEN_ROW})[${index}]/h6`, 'xpath');
  }

  tokenTicker(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKEN_ROW})[${index}]/p`, 'xpath');
  }

  tokenTickerFromName(assetName: string): WebElement {
    return Factory.fromSelector(`${this.TOKEN_ROW}//h6[text() = '${assetName}']/following-sibling::p`, 'xpath');
  }

  grayedOutTokenIcon(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKEN_ICON})[${index}]/div[contains(@class, 'overlay')]`, 'xpath');
  }

  checkmarkInSelectedToken(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKEN_ICON})[${index}]/*[name()='svg']`, 'xpath');
  }

  tokenItemInfo(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKEN_INFO})[${index}]`, 'xpath');
  }

  get nftsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NFTS_BUTTON).parentElement().parentElement();
  }

  get assetSelectorContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ASSET_SELECTOR_CONTAINER);
  }

  get nftItemSelectedCheckmark(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NFT_ITEM_SELECTED_CHECKMARK);
  }

  get nftContainers(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.assetSelectorContainer.$$(this.NFT_CONTAINER);
  }

  get nftNames(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.assetSelectorContainer.$$(this.NFT_ITEM_NAME);
  }

  async getNftContainer(name: string): Promise<WebdriverIO.Element> {
    return (await this.nftContainers.find(
      async (item) => (await item.$(this.NFT_ITEM_NAME).getText()) === name
    )) as WebdriverIO.Element;
  }

  async getNftName(name: string): Promise<WebdriverIO.Element> {
    const nftContainer = await this.getNftContainer(name);
    return nftContainer.$(this.NFT_ITEM_NAME);
  }

  async grayedOutNFT(index: number): Promise<WebdriverIO.Element> {
    return this.nftContainers[index].$(this.NFT_ITEM_OVERLAY);
  }

  async checkmarkInSelectedNFT(index: number): Promise<WebdriverIO.Element> {
    return this.nftContainers[index].$(this.NFT_ITEM_SELECTED_CHECKMARK);
  }

  assetsCounter(): WebElement {
    return Factory.fromSelector(`${this.ASSETS_SELECTION_COUNTER}`, 'xpath');
  }

  get neutralFaceIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEUTRAL_FACE_ICON);
  }

  get sadFaceIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SAD_FACE_ICON);
  }

  get emptyStateMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_MESSAGE);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get clearButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLEAR_BUTTON);
  }

  get selectMultipleButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SELECT_MULTIPLE_BUTTON);
  }

  get addToTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADD_TO_TRANSACTION_BUTTON);
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
