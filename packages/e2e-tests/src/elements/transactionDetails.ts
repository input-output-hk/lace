/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../actor/webTester';
import { DrawerCommonExtended } from './drawerCommonExtended';
import { WebElement, WebElementFactory as Factory } from './webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionDetailsPage extends WebElement {
  protected CONTAINER = '//div[@id="asset-drawer-body"]';
  private TRANSACTION_DETAILS_SKELETON = '.ant-drawer-body .ant-skeleton';
  private TRANSACTION_DETAILS_DESCRIPTION = '//div[@data-testid="tx-description"]';
  private TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS = '//div[@data-testid="tx-description"]//div[2]';
  private TRANSACTION_DETAILS_BUNDLE = '//div[@data-testid="tx-detail-bundle"]';
  private TRANSACTION_DETAILS_HASH = '//div[@data-testid="tx-hash-detail"]';
  private TRANSACTION_DETAILS_SENT = '//div[@data-testid="tx-sent-detail"]';
  private TRANSACTION_DETAILS_SENT_TOKEN = '//span[@data-testid="tx-sent-detail-token"]';
  private TRANSACTION_DETAILS_SENT_ADA = '//span[@data-testid="tx-sent-detail-ada"]';
  private TRANSACTION_DETAILS_SENT_FIAT = '//span[@data-testid="tx-sent-detail-fiat"]';
  private TRANSACTION_DETAILS_TO_ADDRESS = '//div[@data-testid="tx-to-detail"]';
  private TRANSACTION_DETAILS_STATUS = '//div[@data-testid="tx-status"]';
  private TRANSACTION_DETAILS_TIMESTAMP = '//div[@data-testid="tx-timestamp"]';
  private TRANSACTION_DETAILS_FEE_ADA = '//span[@data-testid="tx-fee-ada"]';
  private TRANSACTION_DETAILS_FEE_FIAT = '//span[@data-testid="tx-fee-fiat"]';
  private TRANSACTION_DETAILS_INPUTS_SECTION = '//div[@data-testid="tx-inputs"]';
  private TRANSACTION_DETAILS_OUTPUTS_SECTION = '//div[@data-testid="tx-outputs"]';
  private TRANSACTION_DETAILS_DROPDOWN = '//button[@data-testid="tx-addr-list_toggle"]';

  private TRANSACTION_DETAILS_ADDRESS = '//div[@data-testid="tx-address"]';
  private TRANSACTION_DETAILS_ADA_AMOUNT = '//span[@data-testid="tx-ada-amount"]';
  private TRANSACTION_DETAILS_FIAT_AMOUNT = '//span[@data-testid="tx-fiat-amount"]';
  private TRANSACTION_DETAILS_TOKEN = '//div[@data-testid="tx-asset"]';
  private TRANSACTION_DETAILS_METADATA = '//div[@data-testid="tx-metadata"]';

  private TRANSACTION_DETAILS_POOL_NAME = '//div[@data-testid="tx-pool-name"]';
  private TRANSACTION_DETAILS_POOL_TICKER = '//div[@data-testid="tx-pool-ticker"]';
  private TRANSACTION_STAKE_POOL_ID = '//div[@data-testid="tx-pool-id"]';
  constructor() {
    super();
    this.CONTAINER = new DrawerCommonExtended().container().toJSLocator();
  }

  get transactionDetailsSkeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SKELETON);
  }

  get transactionDetailsStakePoolId(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TRANSACTION_STAKE_POOL_ID}`);
  }
  get transactionDetailsHash(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TRANSACTION_DETAILS_HASH}`);
  }
  transactionDetailsDescription(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_DESCRIPTION}`, 'xpath');
  }

  transactionDetailsAmountOfTokens(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS}`, 'xpath');
  }

  async transactionSentTokensForBundle(index = 1): Promise<WebdriverIO.ElementArray> {
    return $$(`(${this.CONTAINER}${this.TRANSACTION_DETAILS_BUNDLE})[${index}]${this.TRANSACTION_DETAILS_SENT_TOKEN}`);
  }

  async transactionSentTokens(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.TRANSACTION_DETAILS_SENT_TOKEN}`);
  }

  transactionDetailsSentAda(index = 1): WebElement {
    return Factory.fromSelector(
      `(${this.CONTAINER}${this.TRANSACTION_DETAILS_BUNDLE})[${index}]${this.TRANSACTION_DETAILS_SENT_ADA}`,
      'xpath'
    );
  }

  transactionDetailsSentFiat(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_SENT_FIAT}`, 'xpath');
  }

  transactionDetailsToAddress(index = 1): WebElement {
    return Factory.fromSelector(
      `(${this.CONTAINER}${this.TRANSACTION_DETAILS_BUNDLE})[${index}]${this.TRANSACTION_DETAILS_TO_ADDRESS}`,
      'xpath'
    );
  }

  transactionDetailsStatus(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_STATUS}`, 'xpath');
  }

  transactionDetailsTimestamp(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_TIMESTAMP}`, 'xpath');
  }

  transactionDetailsFeeADA(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_FEE_ADA}`, 'xpath');
  }

  transactionDetailsOutputsSection(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_OUTPUTS_SECTION}`, 'xpath');
  }

  transactionDetailsInputsSection(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_INPUTS_SECTION}`, 'xpath');
  }

  transactionDetailsFeeFiat(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_FEE_FIAT}`, 'xpath');
  }

  transactionDetailsInputsDropdown(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_INPUTS_SECTION}${this.TRANSACTION_DETAILS_DROPDOWN}`,
      'xpath'
    );
  }

  transactionDetailsOutputsDropdown(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_OUTPUTS_SECTION}${this.TRANSACTION_DETAILS_DROPDOWN}`,
      'xpath'
    );
  }

  transactionDetailsInputAddress(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_INPUTS_SECTION}${this.TRANSACTION_DETAILS_ADDRESS}`,
      'xpath'
    );
  }

  transactionDetailsOutputAddress(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_OUTPUTS_SECTION}${this.TRANSACTION_DETAILS_ADDRESS}`,
      'xpath'
    );
  }

  transactionDetailsInputAdaAmount(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_INPUTS_SECTION}${this.TRANSACTION_DETAILS_ADA_AMOUNT}`,
      'xpath'
    );
  }

  transactionDetailsOutputAdaAmount(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_OUTPUTS_SECTION}${this.TRANSACTION_DETAILS_ADA_AMOUNT}`,
      'xpath'
    );
  }

  transactionDetailsInputFiatAmount(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_INPUTS_SECTION}${this.TRANSACTION_DETAILS_FIAT_AMOUNT}`,
      'xpath'
    );
  }

  transactionDetailsOutputFiatAmount(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_OUTPUTS_SECTION}${this.TRANSACTION_DETAILS_FIAT_AMOUNT}`,
      'xpath'
    );
  }

  transactionDetailsInputTokens(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_INPUTS_SECTION}${this.TRANSACTION_DETAILS_TOKEN}`,
      'xpath'
    );
  }

  transactionDetailsOutputTokens(): WebElement {
    return Factory.fromSelector(
      `${this.CONTAINER}${this.TRANSACTION_DETAILS_OUTPUTS_SECTION}${this.TRANSACTION_DETAILS_TOKEN}`,
      'xpath'
    );
  }

  get transactionDetailsMetadata(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_METADATA);
  }

  transactionDetailsSent(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_SENT}`, 'xpath');
  }

  transactionDetailsStakepoolName(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_POOL_NAME}`, 'xpath');
  }

  transactionDetailsStakepoolTicker(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TRANSACTION_DETAILS_POOL_TICKER}`, 'xpath');
  }

  async getTransactionDetailInputAdaAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsInputAdaAmount());
  }

  async getTransactionDetailInputFiatAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsInputFiatAmount());
  }

  async getTransactionDetailOutputAdaAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsOutputAdaAmount());
  }

  async getTransactionDetailOutputFiatAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsOutputFiatAmount());
  }

  async getTransactionDetailInputTokenAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsInputTokens());
  }

  async getTransactionDetailOutputTokenAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsOutputTokens());
  }

  async getTransactionDetailFeeADAAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsFeeADA());
  }

  async getTransactionDetailFeeFiatAmount(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsFeeFiat());
  }

  async getTransactionDetailInputAddress(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsInputAddress());
  }

  async getTransactionDetailOutputAddress(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsOutputAddress());
  }

  async getTransactionSentTokensForBundle(index = 1): Promise<string[]> {
    return await webTester.getTextValuesFromArrayElement(await this.transactionSentTokensForBundle(index));
  }

  async getTransactionSentTokensWithoutDuplicates(): Promise<unknown[]> {
    return await webTester.getTextValuesFromArrayElementWithoutDuplicates(await this.transactionSentTokens());
  }

  async getTransactionDetailDescription(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsDescription());
  }

  async getTransactionDetailDescriptionAmountOfAssets(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.transactionDetailsAmountOfTokens());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
