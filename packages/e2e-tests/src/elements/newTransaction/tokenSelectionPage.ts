/* eslint-disable no-undef */
import { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { DrawerCommonExtended } from '../drawerCommonExtended';
import { AddressInput } from '../addressInput';
import { TokenSearchResult } from './tokenSearchResult';
import { ChainablePromiseElement } from 'webdriverio';

export class TokenSelectionPage extends WebElement {
  protected CONTAINER;
  private BUTTONS_CONTAINER = '//div[@data-testid="asset-selector-buttons"]';
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

  constructor() {
    super();
    this.CONTAINER = new DrawerCommonExtended().container().toJSLocator();
  }

  tokensButton(): WebElement {
    return Factory.fromSelector(`${this.BUTTONS_CONTAINER}//label[1]`, 'xpath');
  }

  tokensCaption(): WebElement {
    return Factory.fromSelector(`${this.TOKENS_BUTTON}/parent::span/following::span[1]`, 'xpath');
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

  nftsButton(): WebElement {
    return Factory.fromSelector(`${this.BUTTONS_CONTAINER}//label[2]`, 'xpath');
  }

  nftsCaption(): WebElement {
    return Factory.fromSelector(`${this.NFTS_BUTTON}/parent::span/following::span[1]`, 'xpath');
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

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
