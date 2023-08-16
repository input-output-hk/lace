import TransactionsPage from '../elements/transactionsPage';
import { TestnetPatterns } from '../support/patterns';
import { t } from '../utils/translationService';
import testContext from '../utils/testContext';
import { expect } from 'chai';
import { browser } from '@wdio/globals';

export type ExpectedTransactionRowAssetDetails = {
  type: string;
  tokensAmount: string;
  tokensCount: number;
};

class TransactionsPageAssert {
  assertSeeSkeleton = async (shouldBeVisible: boolean) => {
    await TransactionsPage.transactionsInfiniteScroll.waitForDisplayed({ reverse: !shouldBeVisible });
  };

  waitTxDatesToLoad = async () => {
    await browser.waitUntil(async () => (await TransactionsPage.groupsOfDates()).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for groups of Txs by date'
    });
  };

  assertSeeCexplorerUrl = async (txHashValue: string) => {
    expect(await browser.getUrl()).to.contain(`cexplorer.io/tx/${txHashValue}`);
  };

  waitRowsToLoad = async () => {
    await browser.waitUntil(async () => (await TransactionsPage.rows).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for all transactions'
    });

    await browser.waitUntil(async () => (await TransactionsPage.transactionsDate(0).getText()) !== 'Sending', {
      timeout: 180_000,
      timeoutMsg: 'Transaction is still being sent after 180 seconds'
    });
  };

  assertSeeTitleWithCounter = async () => {
    await TransactionsPage.title.waitForDisplayed();
    await TransactionsPage.counter.waitForDisplayed();
    expect(await TransactionsPage.title.getText()).to.equal(await t('browserView.activity.title'));
    expect(await TransactionsPage.counter.getText()).to.match(TestnetPatterns.COUNTER_REGEX);
  };

  assertCounterNumberMatchesWalletTransactions = async () => {
    const rowsNumber = (await TransactionsPage.rows).length;
    const tokensCounterValue = Number((await TransactionsPage.counter.getText()).slice(1, -1));
    await expect(rowsNumber).to.equal(tokensCounterValue);
  };

  assertTxsLoaded = async () => {
    await (await TransactionsPage.transactionsTableRow(0))?.waitForDisplayed({ timeout: 30_000 });
  };

  async assertSeeDateGroups() {
    await this.waitTxDatesToLoad();
    const rowsNumber = (await TransactionsPage.groupsOfDates()).length;

    for (let i = 0; i < rowsNumber; i++) {
      await TransactionsPage.transactionsDate(i).waitForDisplayed();
    }
  }

  async assertDateFormat() {
    await this.waitTxDatesToLoad();
    const rowsNumber = (await TransactionsPage.groupsOfDates()).length;

    for (let i = 0; i < rowsNumber; i++) {
      await TransactionsPage.transactionsDate(i).waitForDisplayed();
      const date = await TransactionsPage.transactionsDate(i).getText();
      if (date !== 'Today') {
        await expect(date).to.match(TestnetPatterns.TRANSACTIONS_DATE_LIST_REGEX);
      }
    }
  }

  async assertSeeTableItems() {
    await this.waitRowsToLoad();
    const rowsNumber = (await TransactionsPage.rows).length;
    for (let i = 0; i < rowsNumber; i++) {
      await TransactionsPage.transactionsTableItemType(i).waitForDisplayed();
      await TransactionsPage.transactionsTableItemTimestamp(i).waitForDisplayed();
      await TransactionsPage.transactionsTableItemTokensAmount(i).waitForDisplayed();
      await TransactionsPage.transactionsTableItemFiatAmount(i).waitForDisplayed();
      await TransactionsPage.transactionsTableItemIcon(i).waitForDisplayed();
    }
  }

  async assertTableItemDetails(index: number, transactionType: string) {
    await this.waitRowsToLoad();
    expect(await TransactionsPage.transactionsTableItemType(index).getText()).to.be.equal(transactionType);
  }

  async assertTxValueNotZero() {
    await this.waitRowsToLoad();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i < rowsNumber; i++) {
      const txADAValueString = await TransactionsPage.transactionsTableItemTokensAmount(i).getText();
      const txADAValueNumber = txADAValueString.split(' ', 1);
      const txADAValue = Number(txADAValueNumber);

      const txFiatValueString = await TransactionsPage.transactionsTableItemFiatAmount(i).getText();
      const txFiatValueNumber = txFiatValueString.slice(0, -4);
      const txFiatValue = Number(txFiatValueNumber);

      await expect(txADAValue).to.be.greaterThan(0);
      await expect(txFiatValue).to.be.greaterThan(0);
    }
  }

  async assertSeeTransactionRowWithAssetDetails(
    rowIndex: number,
    expectedTransactionRowAssetDetails: ExpectedTransactionRowAssetDetails
  ) {
    await browser.waitUntil(
      async () =>
        (await TransactionsPage.transactionsTableItemType(rowIndex).getText()) ===
        expectedTransactionRowAssetDetails.type,
      {
        timeout: 180_000,
        interval: 3000,
        timeoutMsg: `failed while waiting for transaction type: ${expectedTransactionRowAssetDetails.type}`
      }
    );

    expect(await TransactionsPage.transactionsTableItemTokensAmount(rowIndex).getText()).contains(
      expectedTransactionRowAssetDetails.tokensAmount
    );

    expect(await TransactionsPage.transactionsTableItemTimestamp(rowIndex).getText()).to.match(
      TestnetPatterns.TIMESTAMP_REGEX
    );
  }

  assertSeeMoreTransactions = async () => {
    const currentRowsNumber = (await TransactionsPage.rows).length;
    await expect(currentRowsNumber).to.be.greaterThan(testContext.load('numberOfRows'));
  };

  async assertSeeCurrencySymbol(ticker: 'ADA' | 'tADA') {
    await this.waitRowsToLoad();
    const regex = ticker === 'ADA' ? /[^t]ADA/g : /tADA/g;

    let tickerList = await TransactionsPage.totalAmountList.map(async (totalAmount) =>
      String(((await totalAmount.getText()) as string).match(regex))
    );

    if (ticker === 'ADA') tickerList = tickerList.map((x) => x.trim());

    expect(tickerList.every((x) => x === ticker)).to.be.true;
  }
}

export default new TransactionsPageAssert();
