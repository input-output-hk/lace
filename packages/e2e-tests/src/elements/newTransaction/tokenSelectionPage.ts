/* eslint-disable no-undef */
import { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { DrawerCommonExtended } from '../drawerCommonExtended';
import { AddressInput } from '../addressInput';
import { TokenSearchResult } from './tokenSearchResult';
import { ChainablePromiseElement } from 'webdriverio';

export class TokenSelectionPage extends WebElement {
  protected CONTAINER;
  private TOKENS_BUTTON = '//input[@data-testid="asset-selector-button-tokens"]';
  private TOKEN_ROW = '//div[@data-testid="coin-search-row-info"]';
  private TOKEN_INFO = '//div[@data-testid="coin-search-row-info"]';
  private TOKEN_ICON = '//div[@data-testid="coin-search-row-icon"]';
  private NFTS_BUTTON = '//input[@data-testid="asset-selector-button-nfts"]';
  private NFT_LIST = '//div[@data-testid="nft-list"]';
  private NFT_ITEM = '//a[@data-testid="nft-item"]';
  private NFT_ITEM_NAME = '//p[@data-testid="nft-item-name"]';
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

  tokenItemWithIndex(index: number): WebElement {
    return Factory.fromSelector(`(${this.TOKEN_ROW})[${index}]`, 'xpath');
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

  nftsList(): WebElement {
    return Factory.fromSelector(`${this.NFT_LIST}`, 'xpath');
  }

  nftsItem(): WebElement {
    return Factory.fromSelector(`${this.NFT_ITEM}`, 'xpath');
  }

  nftsItemName(index: number): WebElement {
    return Factory.fromSelector(`(${this.NFT_ITEM_NAME})[${index}]`, 'xpath');
  }

  grayedOutNFT(index: number): WebElement {
    return Factory.fromSelector(`(${this.NFT_ITEM})[${index}]/div/div[contains(@class, 'overlay')]`, 'xpath');
  }

  checkmarkInSelectedNFT(index: number): WebElement {
    return Factory.fromSelector(`(${this.NFT_ITEM})[${index}]/*[name()='svg']`, 'xpath');
  }

  assetsCounter(): WebElement {
    return Factory.fromSelector(`${this.ASSETS_SELECTION_COUNTER}`, 'xpath');
  }

  searchInput(): AddressInput {
    return new AddressInput();
  }

  tokenSearchResult(): TokenSearchResult {
    return new TokenSearchResult();
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
