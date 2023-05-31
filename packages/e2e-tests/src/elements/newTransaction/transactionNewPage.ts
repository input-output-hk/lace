/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { CoinConfigure } from './coinConfigure';
import { AddressInput } from '../addressInput';
import { TransactionBundle } from './transactionBundle';
import { Asset } from '../../data/Asset';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionNewPage extends WebElement {
  private CONTAINER = '//div[@class="ant-drawer-body"]';
  private SEND_TITLE = '//span[contains(., "Send")]';
  private ADD_BUNDLE_BUTTON = '[data-testid="add-bundle-button"]';
  private ATTRIBUTES_LABEL = '//span[contains(@class, "SendTransactionCost-module_label")]';
  private ATTRIBUTES_VALUE_ADA = '//span[contains(@class, "SendTransactionCost-module_ada")]';
  private ATTRIBUTES_VALUE_FIAT = '//span[contains(@class, "SendTransactionCost-module_fiat")]';
  private CONFIRMATION_ADDRESS_ERROR_SELECTOR = '//p[@data-testid="transaction-confirmation-address-error"]';
  private FUNDS_ERROR_SELECTOR = '//span[contains(@class, "CoinConfigure-module_coinInputError")]';
  private ADDR_SEARCH_RESULTS_ROW = '//div[@data-testid="search-result-row"]';
  private ADDR_SEARCH_RESULTS_ROW_NAME = '//span[@data-testid="search-result-name"]';
  private ADDR_SEARCH_RESULTS_ROW_ADDRESS = '//span[@data-testid="search-result-address"]';
  private METADATA_INPUT_FIELD = '[data-testid="metadata-input"]';
  private METADATA_COUNTER = '[data-testid="metadata-counter"]';
  private METADATA_BIN_BUTTON = '[data-testid="text-box-item"]';
  private INVALID_ADDRESS_ERROR_SELECTOR = '//span[@data-testid="address-input-error"]';
  private BUNDLE_DESCRIPTION = '//p[@data-testid="bundle-description"]';
  private BACKGROUND_SECTION = '//div[@data-testid="drawer-navigation"]';
  private REVIEW_TRANSACTION_BUTTON = '#send-next-btn';
  private CANCEL_TRANSACTION_BUTTON = '[data-testid="send-cancel-btn"]';

  constructor() {
    super();
  }

  coinConfigure(index?: number): CoinConfigure {
    return new CoinConfigure(index);
  }

  transactionBundle(index?: number): TransactionBundle {
    return new TransactionBundle(index);
  }

  sendTitleElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SEND_TITLE}`, 'xpath');
  }

  get addBundleButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADD_BUNDLE_BUTTON);
  }

  get backgroundSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.BACKGROUND_SECTION);
  }

  addressInput(index?: number): AddressInput {
    return new AddressInput(index);
  }

  attributeLabel(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ATTRIBUTES_LABEL}`, 'xpath');
  }

  attributeValueAda(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ATTRIBUTES_VALUE_ADA}`, 'xpath');
  }

  attributeValueAdaAllocation(): WebElement {
    return Factory.fromSelector(`(${this.CONTAINER}${this.ATTRIBUTES_VALUE_ADA})[2]`, 'xpath');
  }

  attributeValueFiat(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ATTRIBUTES_VALUE_FIAT}`, 'xpath');
  }

  attributeAdaAllocationValueFiat(): WebElement {
    return Factory.fromSelector(`(${this.CONTAINER}${this.ATTRIBUTES_VALUE_FIAT})[2]`, 'xpath');
  }

  fundsErrorElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.FUNDS_ERROR_SELECTOR}`, 'xpath');
  }

  addressErrorElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.CONFIRMATION_ADDRESS_ERROR_SELECTOR}`, 'xpath');
  }

  addressBookSearchResultRow(index: number): WebElement {
    return Factory.fromSelector(`(${this.ADDR_SEARCH_RESULTS_ROW})[${index}]`, 'xpath');
  }

  addressBookSearchResultRowName(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.ADDR_SEARCH_RESULTS_ROW}${this.ADDR_SEARCH_RESULTS_ROW_NAME})[${index}]`,
      'xpath'
    );
  }

  addressBookSearchResultRowAddress(index: number): WebElement {
    return Factory.fromSelector(
      `(${this.ADDR_SEARCH_RESULTS_ROW}${this.ADDR_SEARCH_RESULTS_ROW_ADDRESS})[${index}]`,
      'xpath'
    );
  }

  get txMetadataInputField(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_INPUT_FIELD);
  }

  get txMetadataCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_COUNTER);
  }

  get metadataBinButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_BIN_BUTTON);
  }

  bundleDescription(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.BUNDLE_DESCRIPTION}`, 'xpath');
  }

  get reviewTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REVIEW_TRANSACTION_BUTTON);
  }

  get cancelTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_TRANSACTION_BUTTON);
  }

  async getAddressError(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.addressErrorElement());
  }

  async getFundsError(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.fundsErrorElement());
  }

  async getValueAda(): Promise<number> {
    const stringValue = (await webTester.getTextValueFromElement(this.attributeValueAda())) as string;
    const stringValueTrimmed = stringValue.replace(` ${Asset.CARDANO.ticker}`, '');
    return Number(stringValueTrimmed);
  }

  async getValueFiat(): Promise<number> {
    const stringValue = (await webTester.getTextValueFromElement(this.attributeValueFiat())) as string;
    const stringValueTrimmed = stringValue.replace('$', '').replace(' USD', '');
    return Number(stringValueTrimmed);
  }

  async getValueAdaAllocation(): Promise<number> {
    const stringValue = (await webTester.getTextValueFromElement(this.attributeValueAdaAllocation())) as string;
    const stringValueTrimmed = stringValue.replace(` ${Asset.CARDANO.ticker}`, '');
    return Number(stringValueTrimmed);
  }

  async getAddressBookSearchResultsRows(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.ADDR_SEARCH_RESULTS_ROW}`);
  }

  async getContactName(index: number): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.addressBookSearchResultRowName(index));
  }

  async getPartialContactAddress(index: number): Promise<string | number> {
    const fullAddress = await webTester.getTextValueFromElement(this.addressBookSearchResultRowAddress(index));
    return String(fullAddress).slice(-7);
  }

  async getBundleDescription(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.bundleDescription());
  }

  invalidAddressError(index: number): WebElement {
    return Factory.fromSelector(`(${this.INVALID_ADDRESS_ERROR_SELECTOR})[${index}]`, 'xpath');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
