import webTester from '../../actor/webTester';
import { TransactionSummaryPage } from '../../elements/newTransaction/transactionSummaryPage';
import { TestnetPatterns } from '../../support/patterns';
import { Button } from '../../elements/button';
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

class TransactionSummaryExtendedAssert {
  async assertSeeSummaryPage(expectedTransactionSummaryData: ExpectedTransactionSummaryData[]) {
    const transactionSummary = new TransactionSummaryPage();

    await expect(await transactionSummary.getMainTitle()).to.equal(
      await t('browserView.transaction.send.drawer.transactionSummary')
    );
    await expect(await transactionSummary.getSubTitle()).to.equal(
      await t('browserView.transaction.send.drawer.breakdownOfYourTransactionCost')
    );

    for (const [i, expectedTransactionSummaryDatum] of expectedTransactionSummaryData.entries()) {
      const shouldVerifyTitle = expectedTransactionSummaryData.length > 1;
      await this.verifyBundle(expectedTransactionSummaryDatum, i, shouldVerifyTitle);
    }

    await expect(await transactionSummary.getFeeTitle()).to.equal(await t('core.outputSummaryList.txFee'));
    await expect((await transactionSummary.getFeeValueAda()) as string).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );
    await expect((await transactionSummary.getFeeValueFiat()) as string).to.match(TestnetPatterns.USD_VALUE_REGEX);

    await webTester.seeWebElement(new Button(await t('browserView.transaction.send.footer.confirm')));
    await webTester.seeWebElement(new Button(await t('browserView.transaction.send.footer.cancel')));
  }

  async verifyBundle(
    expectedTransactionSummaryData: ExpectedTransactionSummaryData,
    bundleIndex: number,
    shouldVerifyBundleTitle: boolean,
    shouldVerifyFiat?: boolean
  ) {
    if (shouldVerifyBundleTitle) {
      await expect(
        await webTester.getTextValueFromElement(new TransactionSummaryPage().bundleRowTitle(bundleIndex + 1))
      ).to.equal(`${await t('core.outputSummaryList.output')} ${bundleIndex + 1}`);
    }
    await expect(
      await webTester.getTextValueFromElement(new TransactionSummaryPage().sendingTitle(bundleIndex + 1))
    ).to.equal(await t('core.outputSummaryList.sending'));
    await expect(
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

      await expect(currentValue).to.equal(expectedValue);
      await expect(currentCurrency).to.contain(expectedCurrency);

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

export default new TransactionSummaryExtendedAssert();
