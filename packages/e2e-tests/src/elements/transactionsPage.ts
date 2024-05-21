/* eslint-disable no-undef */
import SectionTitle from './sectionTitle';
import { ChainablePromiseElement } from 'webdriverio';
import testContext from '../utils/testContext';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { browser } from '@wdio/globals';
import transactionsPageAssert from '../assert/transactionsPageAssert';

class TransactionsPage {
  private TRANSACTIONS_DATE = '[data-testid="transaction-date"]';
  private TRANSACTIONS_GROUPED_BY_DATE = '[data-testid="grouped-asset-activity-list-item"]';
  private TRANSACTIONS_TABLE_ROW = '//div[@data-testid="asset-activity-item"]';
  private TRANSACTIONS_TABLE_ITEM_ICON = '[data-testid="asset-icon"]';
  private TRANSACTIONS_TABLE_ITEM_TYPE = '[data-testid="transaction-type"]';
  private TRANSACTIONS_TABLE_ITEM_TOKENS_AMOUNT = '[data-testid="total-amount"]';
  private TRANSACTIONS_TABLE_ITEM_FIAT_AMOUNT = '[data-testid="fiat-amount"]';
  private TRANSACTIONS_TABLE_ITEM_TIMESTAMP = '[data-testid="timestamp"]';
  private TRANSACTIONS_SKELETON = '[data-testid="infinite-scroll-skeleton"]';
  private TRANSACTIONS_COST_ADA = '[data-testid="send-transaction-fee-ada"]';
  private ASSET_INFO_AMOUNT = '[data-testid="asset-info-amount"]';
  private SUMMARY_FEE_CONTAINER = '[data-testid="summary-fee-container"]';
  private OUTPUT_SUMMARY_CONTAINER = '[data-testid="output-summary-container"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionTitle;
  }

  get counter(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionCounter;
  }

  get transactionCostADA(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTIONS_COST_ADA);
  }

  get transactionFee(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUMMARY_FEE_CONTAINER).$(this.ASSET_INFO_AMOUNT);
  }

  get sendAmount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OUTPUT_SUMMARY_CONTAINER).$(this.ASSET_INFO_AMOUNT);
  }

  get transactionsInfiniteScroll(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTIONS_SKELETON);
  }

  get totalAmountList(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTIONS_TABLE_ITEM_TOKENS_AMOUNT);
  }

  get rows(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTIONS_TABLE_ROW);
  }

  transactionsTableRow(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    const selector = `(${this.TRANSACTIONS_TABLE_ROW})[${index + 1}]`;
    return $(selector);
  }

  transactionsDate(index: number): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return $$(this.TRANSACTIONS_DATE)[index];
  }

  transactionsTableItemIcon(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTIONS_TABLE_ROW)[index].$(this.TRANSACTIONS_TABLE_ITEM_ICON);
  }

  transactionsTableItemType(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTIONS_TABLE_ROW)[index].$(this.TRANSACTIONS_TABLE_ITEM_TYPE);
  }

  transactionsTableItemTokensAmount(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTIONS_TABLE_ROW)[index].$(this.TRANSACTIONS_TABLE_ITEM_TOKENS_AMOUNT);
  }

  transactionsTableItemFiatAmount(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTIONS_TABLE_ROW)[index].$(this.TRANSACTIONS_TABLE_ITEM_FIAT_AMOUNT);
  }

  transactionsTableItemTimestamp(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.TRANSACTIONS_TABLE_ROW)[index].$(this.TRANSACTIONS_TABLE_ITEM_TIMESTAMP);
  }

  groupsOfDates(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTIONS_GROUPED_BY_DATE);
  }

  async clickOnTransactionRow(index: number): Promise<void> {
    const row = await this.transactionsTableRow(index);
    await row.waitForClickable();
    await row.click();
  }

  async scrollToTheRow(index: number) {
    const rowsCount = await this.rows;
    rowsCount[index - 1].scrollIntoView();
    const tokensCounterValue = Number((await this.counter.getText()).slice(1, -1));
    if (tokensCounterValue > rowsCount.length) await transactionsPageAssert.assertSeeSkeleton(true);
  }

  async scrollToTheLastRow() {
    const tokensCounterValue = Number((await this.counter.getText()).slice(1, -1));
    let rowsVisible = 0;
    while (rowsVisible < tokensCounterValue && (await this.rows).length < tokensCounterValue) {
      rowsVisible = (await this.rows).length;
      await this.scrollToTheRow(rowsVisible);
      await browser.pause(1000);
    }
  }
  async getIndexOfTxTypeWithoutScroll(txType: string): Promise<number> {
    const txTypes: string[] = [];
    const tableItems = await $$(this.TRANSACTIONS_TABLE_ITEM_TYPE);
    for (const tableItem of tableItems) {
      txTypes.push(await tableItem.getText());
    }
    return txTypes.indexOf(txType);
  }

  async getIndexOfTxTypeWithScroll(txType: string): Promise<number> {
    await this.scrollToTheLastRow();
    return await this.getIndexOfTxTypeWithoutScroll(txType);
  }

  async getIndexOfTxType(txType: string): Promise<number> {
    const index = await this.getIndexOfTxTypeWithoutScroll(txType);
    if (index === -1) {
      return await this.getIndexOfTxTypeWithScroll(txType);
    }
    return index;
  }

  async saveNumberOfVisibleRows() {
    const numberOfRows = (await this.rows).length;
    testContext.save('numberOfRows', numberOfRows);
  }
}

export default new TransactionsPage();
