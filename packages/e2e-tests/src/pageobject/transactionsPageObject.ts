import webTester from '../actor/webTester';
import { TransactionsPage } from '../elements/transactionsPage';
import testContext from '../utils/testContext';
import { TransactionSummaryPage } from '../elements/newTransaction/transactionSummaryPage';
import { browser } from '@wdio/globals';

export default new (class TransactionsPageObject {
  async clickTransaction(rowNumber: number) {
    await webTester.clickElement(new TransactionsPage().transactionsTableRow(rowNumber));
  }

  async scrollToTheRow(index: number) {
    const transactionsPage = new TransactionsPage();
    const rows = await transactionsPage.getRows();
    await rows[index].scrollIntoView();
  }

  async scrollToTheLastRow() {
    const transactionsPage = new TransactionsPage();
    const tokensCounterValue = Number((await transactionsPage.counter.getText()).slice(1, -1));
    let rowIndex = 0;
    while (rowIndex < tokensCounterValue && (await transactionsPage.getRows()).length < tokensCounterValue) {
      await this.scrollToTheRow(rowIndex);
      rowIndex += 10;
      await browser.pause(1000);
    }
  }

  async saveNumberOfVisibleRows() {
    const transactionsPage = new TransactionsPage();
    const numberOfRows = (await transactionsPage.getRows()).length;
    testContext.save('numberOfRows', numberOfRows);
  }

  async saveFeeValue() {
    let feeValue = (await new TransactionSummaryPage().getFeeValueAda()) as string;
    feeValue = feeValue.replace('ADA', '');
    await testContext.save('feeValue', feeValue);
  }
})();
