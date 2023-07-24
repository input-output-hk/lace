import testContext from '../utils/testContext';
import { TransactionSummaryPage } from '../elements/newTransaction/transactionSummaryPage';

export default new (class TransactionsPageObject {
  async saveFeeValue() {
    let feeValue = (await new TransactionSummaryPage().getFeeValueAda()) as string;
    feeValue = feeValue.replace('ADA', '');
    await testContext.save('feeValue', feeValue);
  }
})();
