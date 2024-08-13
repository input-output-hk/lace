import TransactionsPage from '../elements/transactionsPage';
import { TestnetPatterns } from '../support/patterns';
import { t } from '../utils/translationService';
import testContext from '../utils/testContext';
import { expect } from 'chai';
import { browser } from '@wdio/globals';
import { isPopupMode } from '../utils/pageUtils';
import { ParsedCSSValue } from 'webdriverio';
import { TransactionStyle } from '../types/transactionStyle';
import { TransactionType } from '../types/transactionType';

export type ExpectedTransactionRowAssetDetails = {
  type: string;
  tokensAmount: string;
  tokensCount: number;
};

class TransactionsPageAssert {
  private readonly CSS_COLOR = 'color';

  assertSeeSkeleton = async (shouldBeVisible: boolean) => {
    await TransactionsPage.transactionsInfiniteScroll.waitForDisplayed({ timeout: 10_000, reverse: !shouldBeVisible });
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
    expect(rowsNumber).to.equal(tokensCounterValue);
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
        expect(date).to.match(TestnetPatterns.TRANSACTIONS_DATE_LIST_REGEX);
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

      expect(txADAValue).to.be.not.equal(0);
      expect(txFiatValue).to.be.not.equal(0);
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

    await browser.waitUntil(
      async () =>
        (
          await TransactionsPage.transactionsTableItemTokensAmount(rowIndex).getText()
        ).includes(expectedTransactionRowAssetDetails.tokensAmount),
      {
        timeout: 8000,
        interval: 1000,
        timeoutMsg: 'failed while waiting for tx token details'
      }
    );

    expect(await TransactionsPage.transactionsTableItemTimestamp(rowIndex).getText()).to.match(
      TestnetPatterns.TIMESTAMP_REGEX
    );

    if ((await isPopupMode()) && expectedTransactionRowAssetDetails.tokensCount > 1) {
      const actualTokensCount = await TransactionsPage.transactionsTableItemTokensAmount(rowIndex)
        .getText()
        .then((val) => val.split('+')[1]);
      const expectedTokensCount = expectedTransactionRowAssetDetails.tokensCount - 1;
      expect(Number(actualTokensCount)).to.equal(expectedTokensCount);
    }
  }

  assertSeeMoreTransactions = async () => {
    const currentRowsNumber = (await TransactionsPage.rows).length;
    expect(currentRowsNumber).to.be.greaterThan(testContext.load('numberOfRows'));
  };

  async assertSeeTicker(expectedTicker: 'ADA' | 'tADA') {
    await this.waitRowsToLoad();
    const regex = expectedTicker === 'ADA' ? /[^t]ADA/g : /tADA/g;

    let tickerList = await TransactionsPage.totalAmountList.map(async (totalAmount) =>
      String(((await totalAmount.getText()) as string).match(regex))
    );

    if (expectedTicker === 'ADA') tickerList = tickerList.map((ticker) => ticker.trim());

    expect(tickerList.every((ticker) => ticker === expectedTicker)).to.be.true;
  }

  async assertSeeStylingForTxType(styling: TransactionStyle, txType: TransactionType) {
    const index = await TransactionsPage.getIndexOfTxType(txType);
    expect(await TransactionsPage.transactionsTableItemType(index).getText()).to.equal(txType);

    let expectedColors: string[];
    const amountElement = await TransactionsPage.transactionsTableItemTokensAmount(index);
    if (styling === 'default - negative') {
      expectedColors = ['#3d3b39', '#ffffff'];
      expect((await amountElement.getText())[0]).to.equal('-');
    } else {
      expectedColors = ['#2cb67d'];
      expect((await amountElement.getText())[0]).to.not.equal('-');
    }
    expect(((await amountElement.getCSSProperty(this.CSS_COLOR)) as ParsedCSSValue).parsed.hex).to.be.oneOf(
      expectedColors
    );
  }
}

export default new TransactionsPageAssert();
