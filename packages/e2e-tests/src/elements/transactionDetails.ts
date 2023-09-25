/* eslint-disable no-undef */
import webTester from '../actor/webTester';
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from './CommonDrawerElements';

class TransactionDetailsPage extends CommonDrawerElements {
  protected CONTAINER = '//div[@class="ant-drawer-content"]';
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

  get transactionDetailsDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TRANSACTION_DETAILS_DESCRIPTION}`);
  }

  get transactionDetailsAmountOfTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS);
  }

  async transactionSentTokensForBundle(index = 1): Promise<WebdriverIO.ElementArray> {
    return $$(`(${this.CONTAINER}${this.TRANSACTION_DETAILS_BUNDLE})[${index}]${this.TRANSACTION_DETAILS_SENT_TOKEN}`);
  }

  async transactionSentTokens(): Promise<WebdriverIO.ElementArray> {
    return $$(`${this.CONTAINER}${this.TRANSACTION_DETAILS_SENT_TOKEN}`);
  }

  transactionDetailsSentAda(index = 1): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TRANSACTION_DETAILS_BUNDLE})[${index}]${this.TRANSACTION_DETAILS_SENT_ADA}`);
  }

  get transactionDetailsSentFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_SENT_FIAT);
  }

  transactionDetailsToAddress(index = 1): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TRANSACTION_DETAILS_BUNDLE})[${index}]${this.TRANSACTION_DETAILS_TO_ADDRESS}`);
  }

  get transactionDetailsStatus(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_STATUS);
  }

  get transactionDetailsTimestamp(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_TIMESTAMP);
  }

  get transactionDetailsFeeADA(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_FEE_ADA);
  }

  get transactionDetailsOutputsSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_OUTPUTS_SECTION);
  }

  get transactionDetailsInputsSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_INPUTS_SECTION);
  }

  get transactionDetailsFeeFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_FEE_FIAT);
  }

  get transactionDetailsInputsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_DROPDOWN);
  }

  get transactionDetailsOutputsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_DROPDOWN);
  }

  get transactionDetailsInputAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADDRESS);
  }

  get transactionDetailsOutputAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADDRESS);
  }

  get transactionDetailsInputAdaAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADA_AMOUNT);
  }

  get transactionDetailsOutputAdaAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADA_AMOUNT);
  }

  get transactionDetailsInputFiatAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_FIAT_AMOUNT);
  }

  get transactionDetailsOutputFiatAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_FIAT_AMOUNT);
  }

  get transactionDetailsInputTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_TOKEN);
  }

  get transactionDetailsOutputTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_TOKEN);
  }

  get transactionDetailsMetadata(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_METADATA);
  }

  get transactionDetailsSent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_SENT);
  }

  get transactionDetailsStakepoolName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_POOL_NAME);
  }

  get transactionDetailsStakepoolTicker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.TRANSACTION_DETAILS_POOL_TICKER);
  }

  async getTransactionSentTokensForBundle(index = 1): Promise<string[]> {
    return await webTester.getTextValuesFromArrayElement(await this.transactionSentTokensForBundle(index));
  }

  async getTransactionSentTokensWithoutDuplicates(): Promise<unknown[]> {
    return await webTester.getTextValuesFromArrayElementWithoutDuplicates(await this.transactionSentTokens());
  }

  async closeTransactionDetails(mode: 'extended' | 'popup'): Promise<void> {
    mode === 'popup' ? await this.clickHeaderBackButton() : await this.clickHeaderCloseButton();
  }
}

export default new TransactionDetailsPage();
