import TransactionSummaryPage from '../../elements/newTransaction/transactionSummaryPage';
import { TestnetPatterns } from '../../support/patterns';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { isPopupMode } from '../../utils/pageUtils';

interface ExpectedTransactionSummaryData {
  recipientAddress: string;
  valueToBeSent: valuesToBeSend[];
}

interface valuesToBeSend {
  value: string;
  currency: string;
}

class TransactionSummaryAssert {
  async assertSeeSummaryPage(expectedTransactionSummaryData: ExpectedTransactionSummaryData[], metadata = '') {
    const isPopup = await isPopupMode();
    await TransactionSummaryPage.drawerNavigationTitle.waitForDisplayed({ reverse: isPopup });
    if (!isPopup) {
      expect(await TransactionSummaryPage.drawerNavigationTitle.getText()).to.equal(await t('browserView.assets.send'));
    }
    await TransactionSummaryPage.drawerHeaderBackButton.waitForDisplayed();
    await TransactionSummaryPage.drawerHeaderCloseButton.waitForDisplayed();

    await TransactionSummaryPage.drawerHeaderTitle.waitForDisplayed();
    expect(await TransactionSummaryPage.drawerHeaderTitle.getText()).to.equal(
      await t('browserView.transaction.send.drawer.transactionSummary')
    );
    expect(await TransactionSummaryPage.drawerHeaderSubtitle.getText()).to.equal(
      await t('browserView.transaction.send.drawer.breakdownOfYourTransactionCost')
    );

    for (const [i, expectedTransactionSummaryDatum] of expectedTransactionSummaryData.entries()) {
      const shouldVerifyTitle = expectedTransactionSummaryData.length > 1;
      await this.verifyBundle(expectedTransactionSummaryDatum, i, shouldVerifyTitle);
    }

    if (metadata) {
      await TransactionSummaryPage.metadataTitle.waitForDisplayed();
      expect(await TransactionSummaryPage.metadataTitle.getText()).to.equal(await t('core.outputSummaryList.metaData'));
      await TransactionSummaryPage.metadataValue.waitForDisplayed();
      expect(await TransactionSummaryPage.metadataValue.getText()).to.equal(metadata);
    }

    await TransactionSummaryPage.transactionFeeLabel.waitForDisplayed();
    expect(await TransactionSummaryPage.transactionFeeLabel.getText()).to.equal(
      await t('core.outputSummaryList.txFee')
    );
    await TransactionSummaryPage.transactionFeeValueAda.waitForDisplayed();
    expect(await TransactionSummaryPage.transactionFeeValueAda.getText()).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );
    await TransactionSummaryPage.transactionFeeValueFiat.waitForDisplayed();
    expect(await TransactionSummaryPage.transactionFeeValueFiat.getText()).to.match(TestnetPatterns.USD_VALUE_REGEX);

    await TransactionSummaryPage.confirmButton.waitForDisplayed();
    expect(await TransactionSummaryPage.confirmButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.confirm')
    );
    await TransactionSummaryPage.cancelButton.waitForDisplayed();
    expect(await TransactionSummaryPage.cancelButton.getText()).to.equal(
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
      await TransactionSummaryPage.bundleRowTitle(bundleIndex + 1).waitForDisplayed();
      expect(await TransactionSummaryPage.bundleRowTitle(bundleIndex + 1).getText()).to.equal(
        `${await t('core.outputSummaryList.output')} ${bundleIndex + 1}`
      );
    }
    await TransactionSummaryPage.sendingTitle(bundleIndex + 1).waitForDisplayed();
    expect(await TransactionSummaryPage.sendingTitle(bundleIndex + 1).getText()).to.equal(
      await t('core.outputSummaryList.sending')
    );
    await TransactionSummaryPage.recipientAddressLabel(bundleIndex + 1).scrollIntoView();
    await TransactionSummaryPage.recipientAddressLabel(bundleIndex + 1).waitForDisplayed();
    expect(await TransactionSummaryPage.recipientAddressLabel(bundleIndex + 1).getText()).to.equal(
      await t('core.outputSummaryList.recipientAddress')
    );
    await TransactionSummaryPage.recipientAddressValue(bundleIndex + 1).waitForDisplayed();
    expect(await TransactionSummaryPage.recipientAddressValue(bundleIndex + 1).getText()).to.equal(
      expectedTransactionSummaryData.recipientAddress
    );

    for (let i = 0; i < expectedTransactionSummaryData.valueToBeSent.length; i++) {
      const expectedValue = expectedTransactionSummaryData.valueToBeSent[i].value;
      const expectedCurrency = expectedTransactionSummaryData.valueToBeSent[i].currency;

      await TransactionSummaryPage.sendingValueAda(bundleIndex + 1, i + 1).waitForDisplayed();
      const fieldValue = await TransactionSummaryPage.sendingValueAda(bundleIndex + 1, i + 1).getText();
      const currentValue = fieldValue.split(' ')[0];
      const currentCurrency = fieldValue.slice(Math.max(0, fieldValue.indexOf(' ') + 1));

      expect(currentValue).to.equal(expectedValue);
      expect(currentCurrency).to.contain(expectedCurrency);

      if (shouldVerifyFiat) {
        await TransactionSummaryPage.sendingValueFiat(bundleIndex + 1, i + 1).waitForDisplayed();
        expect(await TransactionSummaryPage.sendingValueFiat(bundleIndex + 1, i + 1).getText()).to.match(
          TestnetPatterns.USD_VALUE_REGEX
        );
      }
    }
  }
}

export default new TransactionSummaryAssert();
