import TransactionsPage from '../elements/transactionsPage';
import ActivityDetailsPage from '../elements/transactionDetails';
import { expect } from 'chai';
import testContext from '../utils/testContext';
import { browser } from '@wdio/globals';
import { t } from '../utils/translationService';

export type ExpectedActivityDetails = {
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

  async assertSeeActivityDetailsDrawer(shouldBeDisplayed: boolean) {
    await ActivityDetailsPage.transactionDetails.waitForDisplayed({ reverse: !shouldBeDisplayed });
    await ActivityDetailsPage.transactionHeader.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await ActivityDetailsPage.transactionHeader.getText()).to.equal(
        await t('package.core.transactionDetailBrowser.header')
      );
    }
  }

  async assertSeeActivityDetails(expectedActivityDetails: ExpectedActivityDetails) {
    await ActivityDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });

    expect(await ActivityDetailsPage.transactionDetailsDescription.getText()).contains(
      `${expectedActivityDetails.transactionDescription}`
    );
    if (expectedActivityDetails.hash) {
      expect(await ActivityDetailsPage.transactionDetailsHash.getText()).to.equal(String(expectedActivityDetails.hash));
    }
    expect(await ActivityDetailsPage.transactionDetailsStatus.getText()).to.equal(expectedActivityDetails.status);
    if (expectedActivityDetails.transactionData) {
      for (let i = 0; i < expectedActivityDetails.transactionData.length; i++) {
        if (expectedActivityDetails.transactionData[i].assets) {
          const actualAssets = await ActivityDetailsPage.getTransactionSentTokensForBundle(i);
          expect(actualAssets.toString()).to.equal(String(expectedActivityDetails.transactionData[i].assets));
        }
        expect(await ActivityDetailsPage.transactionDetailsSentAda(i).getText()).to.equal(
          expectedActivityDetails.transactionData[i].ada
        );

        const expectedAddress = expectedActivityDetails.transactionData[i].address;
        const actualAddressSplit = (await ActivityDetailsPage.transactionDetailsToAddress(i).getText()).split('...');
        if (actualAddressSplit.length === 1) {
          expect(expectedAddress).to.equal(actualAddressSplit[0]);
        } else {
          expect(expectedAddress.startsWith(actualAddressSplit[0])).to.be.true;
          expect(expectedAddress.endsWith(actualAddressSplit[1])).to.be.true;
        }
      }
    }
    if (expectedActivityDetails.poolName) {
      expect(await ActivityDetailsPage.transactionDetailsStakepoolName.getText()).to.equal(
        expectedActivityDetails.poolName
      );
    }
    if (expectedActivityDetails.poolTicker) {
      expect(await ActivityDetailsPage.transactionDetailsStakepoolTicker.getText()).to.equal(
        `(${expectedActivityDetails.poolTicker})`
      );
    }
    if (expectedActivityDetails.poolID) {
      expect(await ActivityDetailsPage.transactionDetailsStakePoolId.getText()).to.equal(
        expectedActivityDetails.poolID
      );
    }
  }

  async assertSeeActivityDetailsUnfolded(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await ActivityDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      await ActivityDetailsPage.transactionDetailsHash.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsStatus.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsTimestamp.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsInputsSection.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsOutputsSection.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsFeeADA.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsFeeFiat.waitForDisplayed();
      const txType = await ActivityDetailsPage.transactionDetailsDescription.getText();
      if (txType.includes('Delegation')) {
        await ActivityDetailsPage.transactionDetailsStakepoolName.waitForDisplayed();
        await ActivityDetailsPage.transactionDetailsStakepoolTicker.waitForDisplayed();
        await ActivityDetailsPage.transactionDetailsStakePoolId.waitForDisplayed();
      }

      await ActivityDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertSeeActivityDetailsInputAndOutputs(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await ActivityDetailsPage.transactionDetailsInputsDropdown.click();
      await ActivityDetailsPage.transactionDetailsOutputsDropdown.click();
      await ActivityDetailsPage.transactionDetailsInputAddress.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsInputAdaAmount.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsInputFiatAmount.waitForDisplayed();
      // TODO refactor steps below
      //  some transactions (ADA only) don't have this field
      // await ActivityDetailsPage.transactionDetailsInputTokens.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsOutputAddress.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsOutputAdaAmount.waitForDisplayed();
      await ActivityDetailsPage.transactionDetailsOutputFiatAmount.waitForDisplayed();
      // await ActivityDetailsPage.transactionDetailsOutputTokens.waitForDisplayed();

      await ActivityDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertTxDetailValuesNotZero(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await ActivityDetailsPage.transactionDetailsInputsDropdown.click();
      await ActivityDetailsPage.transactionDetailsOutputsDropdown.click();

      const txDetailsInputADAValueString = await ActivityDetailsPage.transactionDetailsInputAdaAmount.getText();
      const txDetailsInputADAValue = Number(txDetailsInputADAValueString.split(' ', 1));

      const txDetailsInputFiatValueString = await ActivityDetailsPage.transactionDetailsInputFiatAmount.getText();
      const txDetailsInputFiatValue = Number(txDetailsInputFiatValueString.slice(1).split(' ', 1));

      const txDetailsOutputADAValueString = await ActivityDetailsPage.transactionDetailsOutputAdaAmount.getText();
      const txDetailsOutputADAValue = Number(txDetailsOutputADAValueString.split(' ', 1));

      const txDetailsOutputFiatValueString = await ActivityDetailsPage.transactionDetailsOutputFiatAmount.getText();
      const txDetailsOutputFiatValue = Number(txDetailsOutputFiatValueString.slice(1).split(' ', 1));

      const txDetailsFeeADAValueString = await ActivityDetailsPage.transactionDetailsFeeADA.getText();
      const txDetailsFeeADAValue = Number(txDetailsFeeADAValueString.split(' ', 1));

      const txDetailsFeeFiatValueString = await ActivityDetailsPage.transactionDetailsFeeFiat.getText();
      const txDetailsFeeFiatValue = Number(txDetailsFeeFiatValueString.slice(1).split(' ', 1));

      expect(txDetailsInputADAValue).to.be.greaterThan(0);
      expect(txDetailsInputFiatValue).to.be.greaterThan(0);
      expect(txDetailsOutputADAValue).to.be.greaterThan(0);
      expect(txDetailsOutputFiatValue).to.be.greaterThan(0);
      expect(txDetailsFeeADAValue).to.be.greaterThan(0);
      expect(txDetailsFeeFiatValue).to.be.greaterThan(0);

      await ActivityDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertSeeActivityDetailsSummary(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      const transactionType = await TransactionsPage.transactionsTableItemType(i).getText();
      await TransactionsPage.clickOnTransactionRow(i);
      await ActivityDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      if (
        !['Delegation', 'Stake Key De-Registration', 'Stake Key Registration', 'Self Transaction'].includes(
          transactionType
        )
      ) {
        await ActivityDetailsPage.transactionDetailsSent.waitForDisplayed();
        await ActivityDetailsPage.transactionDetailsToAddress(0).waitForDisplayed();
      }

      await ActivityDetailsPage.closeActivityDetails(mode);
    }
  }

  async assertSeeActivityDetailsSummaryAmounts(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      // TODO Cover self transaction details with automation
      if ((await TransactionsPage.transactionsTableItemType(i).getText()) !== 'Self Transaction') {
        await TransactionsPage.clickOnTransactionRow(i);
        await ActivityDetailsPage.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
        const txType = await ActivityDetailsPage.transactionDetailsDescription.getText();
        if (!txType.includes('Delegation')) {
          const tokensAmountSummary =
            (await ActivityDetailsPage.getTransactionSentTokensWithoutDuplicates()).length + 1;
          let tokensDescriptionAmount = await ActivityDetailsPage.transactionDetailsAmountOfTokens.getText();
          tokensDescriptionAmount = tokensDescriptionAmount.replace('(', '').replace(')', '');
          expect(tokensAmountSummary).to.equal(Number(tokensDescriptionAmount));
        }

        await ActivityDetailsPage.closeActivityDetails(mode);
      }
    }
  }

  async assertTxMetadata() {
    const currentMetadata = await ActivityDetailsPage.transactionDetailsMetadata.getText();
    expect(currentMetadata).to.equal(testContext.load('metadata'));
  }
}

export default new TransactionsDetailsAssert();
