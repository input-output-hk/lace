import TransactionsPage from '../elements/transactionsPage';
import TransactionDetailsPage from '../elements/transactionDetails';
import { expect } from 'chai';
import testContext from '../utils/testContext';
import { browser } from '@wdio/globals';
import { t } from '../utils/translationService';

export type ExpectedTransactionDetails = {
  transactionDescription: string;
  hash?: string;
  transactionData?: transactionData[];
  status: string;
  poolName?: string;
  poolTicker?: string;
  poolID?: string;
};

type transactionData = {
  address: string;
  ada: string;
  assets?: string[];
};

class TransactionsDetailsAssert {
  waitForTransactionsLoaded = async () => {
    await browser.waitUntil(async () => (await TransactionsPage.rows).length > 1, {
      timeout: 10_000,
      timeoutMsg: 'failed while waiting for all transactions'
    });
  };

  async assertSeeTransactionDetailsDrawer(shouldBeDisplayed: boolean) {
    await TransactionDetailsPage.transactionDetails.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await TransactionDetailsPage.transactionHeader.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await TransactionDetailsPage.transactionHeader.getText()).to.equal(
        await t('package.core.transactionDetailBrowser.header')
      );
    }
  }

  async assertSeeTransactionDetails(expectedTransactionDetails: ExpectedTransactionDetails) {
    await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });

    expect(await TransactionDetailsPage.transactionDetailsDescription.getText()).contains(
      `${expectedTransactionDetails.transactionDescription}`
    );
    if (expectedTransactionDetails.hash) {
      expect(await TransactionDetailsPage.transactionDetailsHash.getText()).to.equal(
        String(expectedTransactionDetails.hash)
      );
    }
    expect(await TransactionDetailsPage.transactionDetailsStatus.getText()).to.equal(expectedTransactionDetails.status);
    if (expectedTransactionDetails.transactionData) {
      for (let i = 0; i < expectedTransactionDetails.transactionData.length; i++) {
        if (expectedTransactionDetails.transactionData[i].assets) {
          const actualAssets = await TransactionDetailsPage.getTransactionSentTokensForBundle(i);
          expect(actualAssets.toString()).to.equal(String(expectedTransactionDetails.transactionData[i].assets));
        }
        expect(await TransactionDetailsPage.transactionDetailsSentAda(i).getText()).to.equal(
          expectedTransactionDetails.transactionData[i].ada
        );

        const expectedAddress = expectedTransactionDetails.transactionData[i].address;
        const actualAddressSplit = (await TransactionDetailsPage.transactionDetailsToAddress(i).getText()).split('...');
        if (actualAddressSplit.length === 1) {
          expect(expectedAddress).to.equal(actualAddressSplit[0]);
        } else {
          expect(expectedAddress.startsWith(actualAddressSplit[0])).to.be.true;
          expect(expectedAddress.endsWith(actualAddressSplit[1])).to.be.true;
        }
      }
    }
    if (expectedTransactionDetails.poolName) {
      expect(await TransactionDetailsPage.transactionDetailsStakepoolName.getText()).to.equal(
        expectedTransactionDetails.poolName
      );
    }
    if (expectedTransactionDetails.poolTicker) {
      expect(await TransactionDetailsPage.transactionDetailsStakepoolTicker.getText()).to.equal(
        `(${expectedTransactionDetails.poolTicker})`
      );
    }
    if (expectedTransactionDetails.poolID) {
      expect(await TransactionDetailsPage.transactionDetailsStakePoolId.getText()).to.equal(
        expectedTransactionDetails.poolID
      );
    }
  }

  async assertSeeTransactionDetailsUnfolded(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      await TransactionDetailsPage.transactionDetailsHash.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsStatus.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsTimestamp.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsInputsSection.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsOutputsSection.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsFeeADA.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsFeeFiat.waitForDisplayed();
      const txType = await TransactionDetailsPage.transactionDetailsDescription.getText();
      if (txType.includes('Delegation')) {
        await TransactionDetailsPage.transactionDetailsStakepoolName.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsStakepoolTicker.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsStakePoolId.waitForDisplayed();
      }

      await TransactionDetailsPage.closeTransactionDetails(mode);
    }
  }

  async assertSeeTransactionDetailsInputAndOutputs(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsInputsDropdown.click();
      await TransactionDetailsPage.transactionDetailsOutputsDropdown.click();
      await TransactionDetailsPage.transactionDetailsInputAddress.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsInputAdaAmount.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsInputFiatAmount.waitForDisplayed();
      // TODO refactor steps below
      //  some transactions (ADA only) don't have this field
      // await TransactionDetailsPage.transactionDetailsInputTokens.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsOutputAddress.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsOutputAdaAmount.waitForDisplayed();
      await TransactionDetailsPage.transactionDetailsOutputFiatAmount.waitForDisplayed();
      // await TransactionDetailsPage.transactionDetailsOutputTokens.waitForDisplayed();

      await TransactionDetailsPage.closeTransactionDetails(mode);
    }
  }

  async assertTxDetailValuesNotZero(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsInputsDropdown.click();
      await TransactionDetailsPage.transactionDetailsOutputsDropdown.click();

      const txDetailsInputADAValueString = await TransactionDetailsPage.transactionDetailsInputAdaAmount.getText();
      const txDetailsInputADAValue = Number(txDetailsInputADAValueString.split(' ', 1));

      const txDetailsInputFiatValueString = await TransactionDetailsPage.transactionDetailsInputFiatAmount.getText();
      const txDetailsInputFiatValue = Number(txDetailsInputFiatValueString.slice(1).split(' ', 1));

      const txDetailsOutputADAValueString = await TransactionDetailsPage.transactionDetailsOutputAdaAmount.getText();
      const txDetailsOutputADAValue = Number(txDetailsOutputADAValueString.split(' ', 1));

      const txDetailsOutputFiatValueString = await TransactionDetailsPage.transactionDetailsOutputFiatAmount.getText();
      const txDetailsOutputFiatValue = Number(txDetailsOutputFiatValueString.slice(1).split(' ', 1));

      const txDetailsFeeADAValueString = await TransactionDetailsPage.transactionDetailsFeeADA.getText();
      const txDetailsFeeADAValue = Number(txDetailsFeeADAValueString.split(' ', 1));

      const txDetailsFeeFiatValueString = await TransactionDetailsPage.transactionDetailsFeeFiat.getText();
      const txDetailsFeeFiatValue = Number(txDetailsFeeFiatValueString.slice(1).split(' ', 1));

      expect(txDetailsInputADAValue).to.be.greaterThan(0);
      expect(txDetailsInputFiatValue).to.be.greaterThan(0);
      expect(txDetailsOutputADAValue).to.be.greaterThan(0);
      expect(txDetailsOutputFiatValue).to.be.greaterThan(0);
      expect(txDetailsFeeADAValue).to.be.greaterThan(0);
      expect(txDetailsFeeFiatValue).to.be.greaterThan(0);

      await TransactionDetailsPage.closeTransactionDetails(mode);
    }
  }

  async assertSeeTransactionDetailsSummary(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      const transactionType = await TransactionsPage.transactionsTableItemType(i).getText();
      await TransactionsPage.clickOnTransactionRow(i);
      await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      if (
        !['Delegation', 'Stake Key De-Registration', 'Stake Key Registration', 'Self Transaction'].includes(
          transactionType
        )
      ) {
        await TransactionDetailsPage.transactionDetailsSent.waitForDisplayed();
        await TransactionDetailsPage.transactionDetailsToAddress(0).waitForDisplayed();
      }

      await TransactionDetailsPage.closeTransactionDetails(mode);
    }
  }

  async assertSeeTransactionDetailsSummaryAmounts(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      // TODO Cover self transaction details with automation
      if ((await TransactionsPage.transactionsTableItemType(i).getText()) !== 'Self Transaction') {
        await TransactionsPage.clickOnTransactionRow(i);
        await TransactionDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
        const txType = await TransactionDetailsPage.transactionDetailsDescription.getText();
        if (!txType.includes('Delegation')) {
          const tokensAmountSummary =
            (await TransactionDetailsPage.getTransactionSentTokensWithoutDuplicates()).length + 1;
          let tokensDescriptionAmount = await TransactionDetailsPage.transactionDetailsAmountOfTokens.getText();
          tokensDescriptionAmount = tokensDescriptionAmount.replace('(', '').replace(')', '');
          expect(tokensAmountSummary).to.equal(Number(tokensDescriptionAmount));
        }

        await TransactionDetailsPage.closeTransactionDetails(mode);
      }
    }
  }

  async assertTxMetadata() {
    const currentMetadata = await TransactionDetailsPage.transactionDetailsMetadata.getText();
    expect(currentMetadata).to.equal(testContext.load('metadata'));
  }
}

export default new TransactionsDetailsAssert();
