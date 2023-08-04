import TransactionsPage from '../elements/transactionsPage';
import { TransactionDetailsPage } from '../elements/transactionDetails';
import webTester from '../actor/webTester';
import { expect } from 'chai';
import testContext from '../utils/testContext';

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

  async assertSeeTransactionDetails(expectedTransactionDetails: ExpectedTransactionDetails) {
    const transactionsDetails = new TransactionDetailsPage();
    await transactionsDetails.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });

    await expect(await transactionsDetails.transactionDetailsDescription.getText()).contains(
      `${expectedTransactionDetails.transactionDescription}`
    );
    if (expectedTransactionDetails.hash) {
      await expect(await transactionsDetails.transactionDetailsHash.getText()).to.equal(
        String(expectedTransactionDetails.hash)
      );
    }
    await expect(
      await webTester.getTextValueFromElement(transactionsDetails.transactionDetailsStatus()),
      expectedTransactionDetails.status
    );
    if (expectedTransactionDetails.transactionData) {
      for (let i = 0; i < expectedTransactionDetails.transactionData.length; i++) {
        if (expectedTransactionDetails.transactionData[i].assets) {
          const actualAssets = await transactionsDetails.getTransactionSentTokensForBundle(i + 1);
          await expect(actualAssets.toString()).to.equal(String(expectedTransactionDetails.transactionData[i].assets));
        }
        await expect(
          await webTester.getTextValueFromElement(transactionsDetails.transactionDetailsSentAda(i + 1))
        ).to.equal(expectedTransactionDetails.transactionData[i].ada);

        const expectedAddress = expectedTransactionDetails.transactionData[i].address;
        const actualAddressSplit = (
          (await webTester.getTextValueFromElement(transactionsDetails.transactionDetailsToAddress(i + 1))) as string
        ).split('...');
        if (actualAddressSplit.length === 1) {
          expect(expectedAddress).to.equal(actualAddressSplit[0]);
        } else {
          expect(expectedAddress.startsWith(actualAddressSplit[0])).to.be.true;
          expect(expectedAddress.endsWith(actualAddressSplit[1])).to.be.true;
        }
      }
    }
    if (expectedTransactionDetails.poolName) {
      await expect(
        await webTester.getTextValueFromElement(transactionsDetails.transactionDetailsStakepoolName())
      ).to.equal(expectedTransactionDetails.poolName);
    }
    if (expectedTransactionDetails.poolTicker) {
      await expect(
        await webTester.getTextValueFromElement(transactionsDetails.transactionDetailsStakepoolTicker())
      ).to.equal(expectedTransactionDetails.poolTicker);
    }
    if (expectedTransactionDetails.poolID) {
      await expect(await transactionsDetails.transactionDetailsStakePoolId.getText()).to.equal(
        expectedTransactionDetails.poolID
      );
    }
  }

  async assertSeeTransactionDetailsUnfolded(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const transactionsDetails = new TransactionDetailsPage();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await transactionsDetails.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      await transactionsDetails.transactionDetailsHash.waitForDisplayed();
      await webTester.seeWebElement(transactionsDetails.transactionDetailsStatus());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsTimestamp());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsInputsSection());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsOutputsSection());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsFeeADA());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsFeeFiat());
      const txType = await transactionsDetails.transactionDetailsDescription.getText();
      if (txType.includes('Delegation')) {
        await webTester.seeWebElement(transactionsDetails.transactionDetailsStakepoolName());
        await webTester.seeWebElement(transactionsDetails.transactionDetailsStakepoolTicker());
        await transactionsDetails.transactionDetailsStakePoolId.waitForDisplayed();
      }

      await transactionsDetails.closeTransactionDetails(mode);
    }
  }

  async assertSeeTransactionDetailsInputAndOutputs(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const transactionsDetails = new TransactionDetailsPage();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await webTester.clickElement(transactionsDetails.transactionDetailsInputsDropdown());
      await webTester.clickElement(transactionsDetails.transactionDetailsOutputsDropdown());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsInputAddress());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsInputAdaAmount());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsInputFiatAmount());
      // TODO refactor steps below
      //  some transactions (ADA only) don't have this field
      // await webTester.seeWebElement(transactionsDetails.transactionDetailsInputTokens());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsOutputAddress());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsOutputAdaAmount());
      await webTester.seeWebElement(transactionsDetails.transactionDetailsOutputFiatAmount());
      // await webTester.seeWebElement(transactionsDetails.transactionDetailsOutputTokens());

      await transactionsDetails.closeTransactionDetails(mode);
    }
  }

  async assertTxDetailValuesNotZero(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const transactionsDetails = new TransactionDetailsPage();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      await TransactionsPage.clickOnTransactionRow(i);
      await webTester.clickElement(transactionsDetails.transactionDetailsInputsDropdown());
      await webTester.clickElement(transactionsDetails.transactionDetailsOutputsDropdown());

      const txDetailsInputADAValueString = (await transactionsDetails.getTransactionDetailInputAdaAmount()) as string;
      const txDetailsInputADAValue = Number(txDetailsInputADAValueString.split(' ', 1));

      const txDetailsInputFiatValueString = (await transactionsDetails.getTransactionDetailInputFiatAmount()) as string;
      const txDetailsInputFiatValue = Number(txDetailsInputFiatValueString.slice(1).split(' ', 1));

      const txDetailsOutputADAValueString = (await transactionsDetails.getTransactionDetailOutputAdaAmount()) as string;
      const txDetailsOutputADAValue = Number(txDetailsOutputADAValueString.split(' ', 1));

      const txDetailsOutputFiatValueString =
        (await transactionsDetails.getTransactionDetailOutputFiatAmount()) as string;
      const txDetailsOutputFiatValue = Number(txDetailsOutputFiatValueString.slice(1).split(' ', 1));

      const txDetailsFeeADAValueString = (await transactionsDetails.getTransactionDetailFeeADAAmount()) as string;
      const txDetailsFeeADAValue = Number(txDetailsFeeADAValueString.split(' ', 1));

      const txDetailsFeeFiatValueString = (await transactionsDetails.getTransactionDetailFeeFiatAmount()) as string;
      const txDetailsFeeFiatValue = Number(txDetailsFeeFiatValueString.slice(1).split(' ', 1));

      await expect(txDetailsInputADAValue).to.be.greaterThan(0);
      await expect(txDetailsInputFiatValue).to.be.greaterThan(0);
      await expect(txDetailsOutputADAValue).to.be.greaterThan(0);
      await expect(txDetailsOutputFiatValue).to.be.greaterThan(0);
      await expect(txDetailsFeeADAValue).to.be.greaterThan(0);
      await expect(txDetailsFeeFiatValue).to.be.greaterThan(0);

      await transactionsDetails.closeTransactionDetails(mode);
    }
  }

  async assertSeeTransactionDetailsSummary(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const transactionsDetails = new TransactionDetailsPage();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      const transactionType = await TransactionsPage.transactionsTableItemType(i).getText();
      await TransactionsPage.clickOnTransactionRow(i);
      await transactionsDetails.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
      if (!(transactionType.includes('Delegation') || transactionType.includes('Self'))) {
        await webTester.seeWebElement(transactionsDetails.transactionDetailsSent());
        await webTester.seeWebElement(transactionsDetails.transactionDetailsToAddress());
      }

      await transactionsDetails.closeTransactionDetails(mode);
    }
  }

  async assertSeeTransactionDetailsSummaryAmounts(mode: 'extended' | 'popup') {
    await this.waitForTransactionsLoaded();
    const transactionsDetails = new TransactionDetailsPage();
    const rowsNumber = (await TransactionsPage.rows).length;

    for (let i = 0; i <= rowsNumber && i < 10; i++) {
      // TODO Cover self transaction details with automation
      if ((await TransactionsPage.transactionsTableItemType(i).getText()) !== 'Self Transaction') {
        await TransactionsPage.clickOnTransactionRow(i);
        await transactionsDetails.transactionDetailsDescription.waitForClickable({ timeout: 15_000 });
        const txType = await transactionsDetails.transactionDetailsDescription.getText();
        if (!txType.includes('Delegation')) {
          const tokensAmountSummary =
            (await transactionsDetails.getTransactionSentTokensWithoutDuplicates()).length + 1;
          let tokensDescriptionAmount =
            (await transactionsDetails.getTransactionDetailDescriptionAmountOfAssets()) as string;
          tokensDescriptionAmount = tokensDescriptionAmount.replace('(', '').replace(')', '');
          await expect(tokensAmountSummary).to.equal(Number(tokensDescriptionAmount));
        }

        await transactionsDetails.closeTransactionDetails(mode);
      }
    }
  }

  async assertTxMetadata() {
    const currentMetadata = await new TransactionDetailsPage().transactionDetailsMetadata.getText();
    await expect(currentMetadata).to.equal(testContext.load('metadata'));
  }
}

export default new TransactionsDetailsAssert();
