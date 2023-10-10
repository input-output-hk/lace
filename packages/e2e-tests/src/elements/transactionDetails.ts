/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from './CommonDrawerElements';

class TransactionDetailsPage extends CommonDrawerElements {
  protected CONTAINER = '[data-testid="custom-drawer"]';
  private TRANSACTION_DETAILS = '[data-testid="transaction-detail"]';
  private TRANSACTION_DETAILS_SKELETON = '.ant-drawer-body .ant-skeleton';
  private TRANSACTION_DETAILS_HEADER = '[data-testid="tx-header"]';
  private TRANSACTION_DETAILS_DESCRIPTION = '[data-testid="tx-description"]';
  private TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS = '[data-testid="tx-description-details"]';
  private TRANSACTION_DETAILS_BUNDLE = '[data-testid="tx-detail-bundle"]';
  private TRANSACTION_DETAILS_HASH = '[data-testid="tx-hash-detail"]';
  private TRANSACTION_DETAILS_SENT = '[data-testid="tx-sent-detail"]';
  private TRANSACTION_DETAILS_SENT_TOKEN = '[data-testid="tx-sent-detail-token"]';
  private TRANSACTION_DETAILS_SENT_ADA = '[data-testid="tx-sent-detail-ada"]';
  private TRANSACTION_DETAILS_SENT_FIAT = '[data-testid="tx-sent-detail-fiat"]';
  private TRANSACTION_DETAILS_TO_ADDRESS = '[data-testid="tx-to-detail"]';
  private TRANSACTION_DETAILS_STATUS = '[data-testid="tx-status"]';
  private TRANSACTION_DETAILS_TIMESTAMP = '[data-testid="tx-timestamp"]';
  private TRANSACTION_DETAILS_FEE_ADA = '[data-testid="tx-fee-ada"]';
  private TRANSACTION_DETAILS_FEE_FIAT = '[data-testid="tx-fee-fiat"]';
  private TRANSACTION_DETAILS_INPUTS_SECTION = '[data-testid="tx-inputs"]';
  private TRANSACTION_DETAILS_OUTPUTS_SECTION = '[data-testid="tx-outputs"]';
  private TRANSACTION_DETAILS_DROPDOWN = '[data-testid="tx-addr-list_toggle"]';

  private TRANSACTION_DETAILS_ADDRESS = '[data-testid="tx-address"]';
  private TRANSACTION_DETAILS_ADA_AMOUNT = '[data-testid="tx-ada-amount"]';
  private TRANSACTION_DETAILS_FIAT_AMOUNT = '[data-testid="tx-fiat-amount"]';
  private TRANSACTION_DETAILS_TOKEN = '[data-testid="tx-asset"]';
  private TRANSACTION_DETAILS_METADATA = '[data-testid="tx-metadata"]';

  private TRANSACTION_DETAILS_POOL_NAME = '[data-testid="tx-pool-name"]';
  private TRANSACTION_DETAILS_POOL_TICKER = '[data-testid="tx-pool-ticker"]';
  private TRANSACTION_STAKE_POOL_ID = '[data-testid="tx-pool-id"]';

  get transactionDetailsSkeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SKELETON);
  }

  get transactionHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_HEADER);
  }

  get transactionDetails(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS);
  }

  get transactionDetailsStakePoolId(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_STAKE_POOL_ID);
  }
  get transactionDetailsHash(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_HASH);
  }

  get transactionDetailsDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DESCRIPTION);
  }

  get transactionDetailsAmountOfTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_DESCRIPTION_AMOUNT_OF_TOKENS);
  }

  async transactionSentTokensForBundle(index = 0): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$$(this.TRANSACTION_DETAILS_SENT_TOKEN);
  }

  async transactionSentTokens(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_DETAILS_SENT_TOKEN);
  }

  transactionDetailsSentAda(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_SENT_ADA);
  }

  get transactionDetailsSentFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SENT_FIAT);
  }

  transactionDetailsToAddress(index = 0): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTION_DETAILS_BUNDLE)[index].$(this.TRANSACTION_DETAILS_TO_ADDRESS);
  }

  get transactionDetailsStatus(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_STATUS);
  }

  get transactionDetailsTimestamp(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_TIMESTAMP);
  }

  get transactionDetailsFeeADA(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_FEE_ADA);
  }

  get transactionDetailsOutputsSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION);
  }

  get transactionDetailsInputsSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION);
  }

  get transactionDetailsFeeFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_FEE_FIAT);
  }

  get transactionDetailsInputsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_DROPDOWN);
  }

  get transactionDetailsOutputsDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_DROPDOWN);
  }

  get transactionDetailsInputAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADDRESS);
  }

  get transactionDetailsOutputAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADDRESS);
  }

  get transactionDetailsInputAdaAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADA_AMOUNT);
  }

  get transactionDetailsOutputAdaAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_ADA_AMOUNT);
  }

  get transactionDetailsInputFiatAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_FIAT_AMOUNT);
  }

  get transactionDetailsOutputFiatAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_FIAT_AMOUNT);
  }

  get transactionDetailsInputTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_INPUTS_SECTION).$(this.TRANSACTION_DETAILS_TOKEN);
  }

  get transactionDetailsOutputTokens(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_OUTPUTS_SECTION).$(this.TRANSACTION_DETAILS_TOKEN);
  }

  get transactionDetailsMetadata(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_METADATA);
  }

  get transactionDetailsSent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_SENT);
  }

  get transactionDetailsStakepoolName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_POOL_NAME);
  }

  get transactionDetailsStakepoolTicker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DETAILS_POOL_TICKER);
  }

  async getTransactionSentTokensForBundle(index = 0): Promise<string[]> {
    const array = await this.transactionSentTokensForBundle(index);
    return Promise.all(array.map(async (element) => await element.getText()));
  }

  async getTransactionSentTokensWithoutDuplicates(): Promise<unknown[]> {
    const array = await this.transactionSentTokens();
    const arr = Promise.all(array.map(async (element) => (await element.getText()).split(' ').pop()));
    return [...new Set(await arr)];
  }

  async closeTransactionDetails(mode: 'extended' | 'popup'): Promise<void> {
    mode === 'popup' ? await this.clickHeaderBackButton() : await this.clickHeaderCloseButton();
  }

  async clickInputsDropdown(): Promise<void> {
    await this.transactionDetailsInputsDropdown.click();
  }

  async clickOutputsDropdown(): Promise<void> {
    await this.transactionDetailsOutputsDropdown.click();
  }
}

export default new TransactionDetailsPage();
