import { When, Then } from '@cucumber/cucumber';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import TransactionsDetailsAssert from '../assert/transactionDetailsAssert';
import TransactionNewPage from '../elements/newTransaction/transactionNewPage';

When(/I do not enter metadata/, async () => {
  // DO NOTHING
});

When(/I enter minimum metadata/, async () => {
  await TransactionNewPage.fillMetadata(1);
});

When(/I enter more than maximum metadata allowed/, async () => {
  await TransactionNewPage.fillMetadata(161);
});

When(/I enter maximum metadata allowed/, async () => {
  await TransactionNewPage.fillMetadata(160);
});

When(/^I save the metadata value$/, async () => {
  await TransactionNewPage.saveMetadata();
});

Then(/^Metadata counter (is|is not) displayed$/, async (shouldSee: string) => {
  await drawerSendExtendedAssert.assertSeeMetadataCounter(shouldSee === 'is');
});

Then(/^Warning hint (is|is not) shown$/, async (shouldSee: string) => {
  await drawerSendExtendedAssert.assertSeeMetadataCounterWarning(shouldSee === 'is');
});

Then(/^The Tx details display the sent metadata$/, async () => {
  await TransactionsDetailsAssert.assertTxMetadata();
});
