import webTester from '../../actor/webTester';
import { TransactionSummaryPage } from '../../elements/newTransaction/transactionSummaryPage';
import { TestnetPatterns } from '../../support/patterns';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

interface ExpectedTransactionSummaryData {
  recipientAddress: string;
  valueToBeSent: valuesToBeSend[];
}

interface valuesToBeSend {
  value: string;
  currency: string;
}

class TransactionSummaryAssert {
  async assertSeeSummaryPage(expectedTransactionSummaryData: ExpectedTransactionSummaryData[]) {
    const transactionSummary = new TransactionSummaryPage();

    expect(await transactionSummary.getMainTitle()).to.equal(
      await t('browserView.transaction.send.drawer.transactionSummary')
    );
    expect(await transactionSummary.getSubTitle()).to.equal(
      await t('browserView.transaction.send.drawer.breakdownOfYourTransactionCost')
    );

    for (const [i, expectedTransactionSummaryDatum] of expectedTransactionSummaryData.entries()) {
      const shouldVerifyTitle = expectedTransactionSummaryData.length > 1;
      await this.verifyBundle(expectedTransactionSummaryDatum, i, shouldVerifyTitle);
    }

    expect(await transactionSummary.getFeeTitle()).to.equal(await t('core.outputSummaryList.txFee'));
    expect((await transactionSummary.getFeeValueAda()) as string).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
    expect((await transactionSummary.getFeeValueFiat()) as string).to.match(TestnetPatterns.USD_VALUE_REGEX);

    await transactionSummary.confirmButton.waitForDisplayed();
    expect(await transactionSummary.confirmButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.confirm')
    );
    await transactionSummary.cancelButton.waitForDisplayed();
    expect(await transactionSummary.cancelButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.cancel')
    );
  }

  async verifyBundle(
    expectedTransactionSummaryData: ExpectedTransactionSummaryData,
    bundleIndex: number,
    shouldVerifyBundleTitle: boolean,
    shouldVerifyFiat?: boolean
  ) {
    if (shouldVerifyBundleTitle) {
      expect(
        await webTester.getTextValueFromElement(new TransactionSummaryPage().bundleRowTitle(bundleIndex + 1))
      ).to.equal(`${await t('core.outputSummaryList.output')} ${bundleIndex + 1}`);
    }
    expect(
      await webTester.getTextValueFromElement(new TransactionSummaryPage().sendingTitle(bundleIndex + 1))
    ).to.equal(await t('core.outputSummaryList.sending'));
    expect(
      await webTester.getTextValueFromElement(new TransactionSummaryPage().recipientTitle(bundleIndex + 1))
    ).to.equal(await t('core.outputSummaryList.recipientAddress'));

    for (let i = 0; i < expectedTransactionSummaryData.valueToBeSent.length; i++) {
      const expectedValue = expectedTransactionSummaryData.valueToBeSent[i].value;
      const expectedCurrency = expectedTransactionSummaryData.valueToBeSent[i].currency;

      const fieldValue = (await webTester.getTextValueFromElement(
        new TransactionSummaryPage().sendingValueAda(bundleIndex + 1, i + 1)
      )) as string;
      const currentValue = fieldValue.split(' ')[0];
      const currentCurrency = fieldValue.slice(Math.max(0, fieldValue.indexOf(' ') + 1));

      expect(currentValue).to.equal(expectedValue);
      expect(currentCurrency).to.contain(expectedCurrency);

      if (shouldVerifyFiat) {
        expect(
          String(
            await webTester.getTextValueFromElement(
              new TransactionSummaryPage().sendingValueFiat(bundleIndex + 1, i + 1)
            )
          )
        ).to.match(TestnetPatterns.USD_VALUE_REGEX);
      }
    }
  }
}

export default new TransactionSummaryAssert();
