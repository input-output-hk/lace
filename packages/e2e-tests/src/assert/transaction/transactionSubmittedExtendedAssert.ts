import webTester from '../../actor/webTester';
import { TransactionSubmittedPage } from '../../elements/newTransaction/transactionSubmittedPage';
import TransactionErrorPage from '../../elements/newTransaction/transactionErrorPage';
import { Button } from '../../elements/button';
import { Logger } from '../../support/logger';
import { t } from '../../utils/translationService';
import testContext from '../../utils/testContext';
import { expect } from 'chai';

class TransactionSubmittedExtendedAssert {
  async assertSeeTransactionSubmittedPage(): Promise<any> {
    const transactionSubmittedPage = new TransactionSubmittedPage();

    await webTester.seeWebElement(transactionSubmittedPage.image());

    await expect(await transactionSubmittedPage.getMainTitle()).to.equal(
      await t('browserView.transaction.success.youCanSafelyCloseThisPanel')
    );

    await expect(await transactionSubmittedPage.getSubTitle()).to.equal(
      await t('browserView.transaction.success.thisMayTakeAFewMinutes')
    );

    const txHashElement = transactionSubmittedPage.txHash();
    const txHashValue = String(await webTester.getTextValueFromElement(txHashElement));
    await webTester.seeWebElement(txHashElement);

    await webTester.seeWebElement(new Button(await t('browserView.transaction.send.footer.viewTransaction')));
    await webTester.seeWebElement(new Button(await t('browserView.transaction.send.footer.close')));

    Logger.log(`saving tx hash: ${txHashValue}`);
    testContext.save('txHashValue', txHashValue);
  }

  async assertSeeTransactionErrorPage() {
    await TransactionErrorPage.closeButton.waitForDisplayed();
    await TransactionErrorPage.mainTitle.waitForDisplayed({ timeout: 10_000 });
    await expect(await TransactionErrorPage.mainTitle.getText()).to.equal(
      await t('browserView.transaction.fail.oopsSomethingWentWrong')
    );
    await TransactionErrorPage.descriptionLine1.waitForDisplayed();
    await expect(await TransactionErrorPage.descriptionLine1.getText()).to.equal(
      await t('browserView.transaction.fail.problemSubmittingYourTransaction')
    );
    await TransactionErrorPage.descriptionLine2.waitForDisplayed();
    await expect(await TransactionErrorPage.descriptionLine2.getText()).to.equal(
      await t('browserView.transaction.fail.clickBackAndTryAgain')
    );

    await TransactionErrorPage.image.waitForDisplayed();

    await TransactionErrorPage.cancelButton.waitForDisplayed();
    await expect(await TransactionErrorPage.cancelButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.cancel')
    );
    await TransactionErrorPage.backButton.waitForDisplayed();
    await expect(await TransactionErrorPage.backButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.fail')
    );
  }
}

export default new TransactionSubmittedExtendedAssert();
