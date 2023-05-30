import { TransactionsPage } from '../elements/transactionsPage';
import { TestnetPatterns } from '../support/patterns';
import webTester from '../actor/webTester';
import { t } from '../utils/translationService';
import testContext from '../utils/testContext';
import { expect } from 'chai';

export type ExpectedTransactionRowAssetDetails = {
  type: string;
  tokensAmount: string;
  tokensCount: number;
};

class TransactionsPageAssert {
  assertSeeSkeleton = async (shouldBeVisible: boolean) => {
    const transactionsPage = new TransactionsPage();
    const infiniteScrollElement = transactionsPage.transactionsInfiniteScroll();
    await (shouldBeVisible
      ? webTester.waitUntilSeeElement(infiniteScrollElement)
      : webTester.dontSeeWebElement(infiniteScrollElement));
  };

  waitTxDatesToLoad = async () => {
    const transactionsPage = new TransactionsPage();
    await browser.waitUntil(async () => (await transactionsPage.getGroupsOfDates()).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for groups of Txs by date'
    });
  };

  assertSeeCexplorerUrl = async (txHashValue: string) => {
    expect(await browser.getUrl()).to.contain(`cexplorer.io/tx/${txHashValue}`);
  };

  waitRowsToLoad = async () => {
    const transactionsPage = new TransactionsPage();
    await browser.waitUntil(async () => (await transactionsPage.getRows()).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for all transactions'
    });

    await browser.waitUntil(async () => (await transactionsPage.getTransactionDate(1)) !== 'Sending', {
      timeout: 180_000,
      timeoutMsg: 'Transaction is still being sent after 180 seconds'
    });
  };

  assertSeeTitleWithCounter = async () => {
    const transactionsPage = new TransactionsPage();
    await transactionsPage.title.waitForDisplayed();
    await transactionsPage.counter.waitForDisplayed();
    await expect(await transactionsPage.title.getText()).to.equal(await t('browserView.activity.title'));
    await expect((await transactionsPage.counter.getText()) as string).to.match(TestnetPatterns.COUNTER_REGEX);
  };

  assertCounterNumberMatchesWalletTransactions = async () => {
    const transactionsPage = new TransactionsPage();
    const rowsNumber = (await transactionsPage.getRows()).length;
    const tokensCounterValue = Number((await transactionsPage.counter.getText()).slice(1, -1));
    await expect(rowsNumber).to.equal(tokensCounterValue);
  };

  assertTxsLoaded = async () => {
    const transactionsPage = new TransactionsPage();
    await webTester.waitUntilSeeElement(transactionsPage.transactionsTableRow(1), 30_000);
  };

  async assertSeeDateGroups() {
    await this.waitTxDatesToLoad();
    const transactionsPage = new TransactionsPage();
    const rowsNumber = (await transactionsPage.getGroupsOfDates()).length;

    for (let i = 1; i <= rowsNumber; i++) {
      await webTester.seeWebElement(transactionsPage.transactionsDate(i));
    }
  }

  async assertDateFormat() {
    await this.waitTxDatesToLoad();
    const transactionsPage = new TransactionsPage();
    const rowsNumber = (await transactionsPage.getGroupsOfDates()).length;

    for (let i = 1; i <= rowsNumber; i++) {
      await webTester.seeWebElement(transactionsPage.transactionsDate(i));
      const date = (await transactionsPage.getTransactionDate(i)) as string;
      if (date !== 'Today') {
        await expect(date).to.match(TestnetPatterns.TRANSACTIONS_DATE_LIST_REGEX);
      }
    }
  }

  async assertSeeTableItems() {
    await this.waitRowsToLoad();
    const transactionsPage = new TransactionsPage();
    const rowsNumber = (await transactionsPage.getRows()).length;
    for (let i = 1; i <= rowsNumber; i++) {
      await webTester.seeWebElement(transactionsPage.transactionsTableItemType(i));
      await webTester.seeWebElement(transactionsPage.transactionsTableItemTimestamp(i));
      await webTester.seeWebElement(transactionsPage.transactionsTableItemTokensAmount(i));
      await webTester.seeWebElement(transactionsPage.transactionsTableItemFiatAmount(i));
      await webTester.seeWebElement(transactionsPage.transactionsTableItemIcon(i));
    }
  }

  async assertTableItemDetails(index: number, transactionType: string) {
    const transactionsPage = new TransactionsPage();
    await this.waitRowsToLoad();
    await expect(await transactionsPage.getTransactionType(index)).to.be.equal(transactionType);
  }

  async assertTxValueNotZero() {
    await this.waitRowsToLoad();
    const transactionsPage = new TransactionsPage();
    const rowsNumber = (await transactionsPage.getRows()).length;

    for (let i = 1; i <= rowsNumber; i++) {
      const txADAValueString = (await transactionsPage.getTransactionTokensAmount(i)) as string;
      const txADAValueNumber = txADAValueString.split(' ', 1);
      const txADAValue = Number(txADAValueNumber);

      const txFiatValueString = (await transactionsPage.getTransactionFiatAmount(i)) as string;
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
    const transactionsPage = new TransactionsPage();

    await browser.waitUntil(
      async () => (await transactionsPage.getTransactionType(rowIndex)) === expectedTransactionRowAssetDetails.type,
      {
        timeout: 180_000,
        interval: 3000,
        timeoutMsg: `failed while waiting for transaction type: ${expectedTransactionRowAssetDetails.type}`
      }
    );

    await expect(await transactionsPage.getTransactionTokensAmount(rowIndex)).contains(
      expectedTransactionRowAssetDetails.tokensAmount
    );

    await expect((await transactionsPage.getTransactionTimestamp(rowIndex)) as string).to.match(
      TestnetPatterns.TIMESTAMP_REGEX
    );
  }

  assertSeeMoreTransactions = async () => {
    const transactionsPage = new TransactionsPage();
    const currentRowsNumber = (await transactionsPage.getRows()).length;
    await expect(currentRowsNumber).to.be.greaterThan(testContext.load('numberOfRows'));
  };
}

export default new TransactionsPageAssert();
