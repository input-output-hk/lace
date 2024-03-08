import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import transactionsPageAssert, { ExpectedTransactionRowAssetDetails } from '../assert/transactionsPageAssert';
import transactionDetailsAssert, { PoolData } from '../assert/transactionDetailsAssert';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import transactionBundleAssert from '../assert/transaction/transactionBundleAssert';
import NewTransactionExtendedPageObject from '../pageobject/newTransactionExtendedPageObject';
import testContext from '../utils/testContext';
import TransactionDetailsPage from '../elements/transactionDetails';
import simpleTxSideDrawerPageObject from '../pageobject/simpleTxSideDrawerPageObject';
import TransactionsPage from '../elements/transactionsPage';
import { Logger } from '../support/logger';
import { browser } from '@wdio/globals';

Given(/^I am on the Transactions section - Extended view$/, async () => {
  await mainMenuPageObject.navigateToSection('Transactions', 'extended');
  await transactionsPageAssert.assertTxsLoaded();
});

Given(/^I am on the Transactions section - popup view$/, async () => {
  await mainMenuPageObject.navigateToSection('Transactions', 'popup');
  await transactionsPageAssert.assertTxsLoaded();
});

Then(/^Transactions section is displayed$/, async () => {
  await transactionsPageAssert.assertTxsLoaded();
  await transactionsPageAssert.assertSeeTitleWithCounter();
});

Then(/^a transactions counter that sums up to the total number of all transactions is displayed$/, async () => {
  await transactionsPageAssert.assertTxsLoaded();
  await transactionsPageAssert.assertCounterNumberMatchesWalletTransactions();
});

Then(/^all transactions are grouped by date$/, async () => {
  await transactionsPageAssert.assertTxsLoaded();
  await transactionsPageAssert.assertSeeDateGroups();
  await transactionsPageAssert.assertDateFormat();
});

Then(/^all transactions have icon, type of transaction, amount of tokens, value, and value in FIAT$/, async () => {
  await transactionsPageAssert.assertTxsLoaded();
  await transactionsPageAssert.assertSeeTableItems();
});

Then(/^I can see transaction ([^"]*) with type "([^"]*)"$/, async (index: number, type: string) => {
  await transactionsPageAssert.assertTableItemDetails(index - 1, type);
});

When(/^click on a transaction$/, async () => {
  //  DO NOTHING - COVERED IN NEXT STEP TO CHECK ALL TRANSACTIONS
});

When(/^I click on a transaction: (\d)$/, async (rowNumber: number) => {
  await TransactionsPage.clickOnTransactionRow(rowNumber - 1);
});

When(/^I click on a transaction hash and save hash information$/, async () => {
  testContext.save('txHashValue', await TransactionDetailsPage.transactionDetailsHash.getText());
  await TransactionDetailsPage.transactionDetailsHash.click();
});

When(/^I click on a transaction hash$/, async () => {
  await TransactionDetailsPage.transactionDetailsHash.click();
});

Then(/^I see cexplorer url with correct transaction hash$/, async () => {
  const txHashValue = String(await testContext.load('txHashValue'));
  await transactionsPageAssert.assertSeeCexplorerUrl(txHashValue);
});

When(
  /^I click and open recent transactions details until find transaction with correct (hash|poolID)$/,
  async (valueForCheck: string) => {
    await transactionsPageAssert.waitRowsToLoad();
    for (let i = 0; i < 10; i++) {
      let actualValue;
      let expectedValue;
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsSkeleton.waitForDisplayed({ timeout: 30_000, reverse: true });
      if (valueForCheck === 'hash') {
        actualValue = await TransactionDetailsPage.transactionDetailsHash.getText();
        expectedValue = String(testContext.load('txHashValue'));
      } else {
        actualValue = await TransactionDetailsPage.transactionDetailsStakePoolId.getText();
        const expectedPoolData: PoolData[] = testContext.load('stakePoolsInUse');
        expectedValue = expectedPoolData[0].poolId;
      }
      if (actualValue !== expectedValue) {
        await simpleTxSideDrawerPageObject.clickCloseDrawerButton();
      } else {
        break;
      }
    }
  }
);

When(/^I wait for the transaction history to be loaded and all transactions to be confirmed/, async () => {
  await transactionsPageAssert.waitRowsToLoad();
});

Then(
  /^a side drawer is displayed showing the following information in (extended|popup) mode$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (mode: 'extended' | 'popup', _item: DataTable) => {
    await transactionDetailsAssert.assertSeeActivityDetailsUnfolded(mode);
  }
);

When(/^I click on a transaction and click on both dropdowns$/, async () => {
  //  DO NOTHING - COVERED IN NEXT STEP TO CHECK ALL TRANSACTIONS
});

When(/^I click on inputs dropdowns$/, async () => {
  await TransactionDetailsPage.clickInputsDropdown();
});

When(/^I click on outputs dropdowns$/, async () => {
  await TransactionDetailsPage.clickOutputsDropdown();
});

Then(
  /^all inputs and outputs of the transactions are displayed in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await transactionDetailsAssert.assertSeeActivityDetailsInputAndOutputs(mode);
  }
);

Then(/^I see (ADA|tADA) in the list of transactions$/, async (expectedTicker: 'ADA' | 'tADA') => {
  await transactionsPageAssert.assertSeeTicker(expectedTicker);
});

Then(/^all the transactions have a value other than zero$/, async () => {
  await transactionsPageAssert.assertTxValueNotZero();
});

Then(/none of the input and output values is zero in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await transactionDetailsAssert.assertTxDetailValuesNotZero(mode);
});

Then(
  /the amounts sent or received are displayed below the Tx hash in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await transactionDetailsAssert.assertSeeActivityDetailsSummary(mode);
  }
);

Then(/the Sender or Receiver is displayed$/, async () => {
  // DO NOTHING, COVERED IN PREVIOUS STEP
});

Then(
  /the amounts summary shows as many rows as assets sent or received minus 1 -ADA- in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await transactionDetailsAssert.assertSeeActivityDetailsSummaryAmounts(mode);
  }
);

When(/^I scroll to the row: (\d*)$/, async (index: number) => {
  await TransactionsPage.scrollToTheRow(index);
});

When(/^I scroll to the last row$/, async () => {
  await TransactionsPage.scrollToTheLastRow();
});

Then(/^a skeleton (is|is not) displayed at the bottom of the page/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await transactionsPageAssert.assertSeeSkeleton(shouldBeDisplayed === 'is');
});

When(/^I save number of visible rows$/, async () => {
  await TransactionsPage.saveNumberOfVisibleRows();
});

Then(/^more transactions are loaded$/, async () => {
  await transactionsPageAssert.assertSeeMoreTransactions();
});

Then(
  /^the (Received|Sent) transaction is displayed with value: "([^"]*)" and tokens count (\d)$/,
  async (transactionType: 'Received' | 'Sent', tokenValue: string, tokenCount: number) => {
    await browser.pause(3000);
    const expectedTransactionRowAssetDetailsSent: ExpectedTransactionRowAssetDetails = {
      type: transactionType,
      tokensAmount: `${tokenValue}`,
      tokensCount: Number(tokenCount)
    };
    await transactionsPageAssert.assertSeeTransactionRowWithAssetDetails(0, expectedTransactionRowAssetDetailsSent);
  }
);

When(/^I add all available token types to bundle (\d+)$/, async (bundleIndex: number) => {
  await NewTransactionExtendedPageObject.addAllAvailableTokenTypes(bundleIndex);
});

When(/^I add all available NFT types to bundle (\d+)$/, async (bundleIndex: number) => {
  await NewTransactionExtendedPageObject.addAllAvailableNftTypes(bundleIndex);
});

Then(/^the 'Add asset' is (enabled|disabled) for bundle (\d)$/, async (state: string, bundleIndex: number) => {
  await transactionBundleAssert.assertAddAssetButtonIsEnabled(bundleIndex, state === 'enabled');
});

Then(
  /^I can see transaction (\d) has type "([^"]*)" and value "([^"]*)"$/,
  async (txIndex: number, txType: string, txAdaValue: string) => {
    await transactionsPageAssert.assertTableItemDetails(txIndex - 1, txType);
    const expectedActivityDetails: ExpectedTransactionRowAssetDetails = {
      type: txType,
      tokensAmount: txAdaValue,
      tokensCount: 0
    };
    await transactionsPageAssert.assertSeeTransactionRowWithAssetDetails(txIndex - 1, expectedActivityDetails);
  }
);

Then(/^Transaction details drawer (is|is not) displayed$/, async (state: 'is' | 'is not') => {
  await transactionDetailsAssert.assertSeeActivityDetailsDrawer(state === 'is');
});

Then(/^I save tx hash value "([^"]*)"$/, async (hash: string) => {
  Logger.log(`saving tx hash: ${hash}`);
  testContext.save('txHashValue', hash);
});
