/* eslint-disable no-unused-vars */
import { When, Then } from '@cucumber/cucumber';
import transactionExtendedPageObject from '../pageobject/newTransactionExtendedPageObject';
import drawerSendExtendedAssert from '../assert/drawerSendExtendedAssert';
import TransactionsDetailsAssert from '../assert/transactionDetailsAssert';

When(/I do not enter metadata/, async () => {
  // DO NOTHING
});

When(/I enter minimum metadata/, async () => {
  await transactionExtendedPageObject.fillMetadata(1);
});

When(/I enter more than maximum metadata allowed/, async () => {
  await transactionExtendedPageObject.fillMetadata(161);
});

When(/I enter maximum metadata allowed/, async () => {
  await transactionExtendedPageObject.fillMetadata(160);
});

When(/^I save the metadata value$/, async () => {
  await transactionExtendedPageObject.saveMetadata();
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
