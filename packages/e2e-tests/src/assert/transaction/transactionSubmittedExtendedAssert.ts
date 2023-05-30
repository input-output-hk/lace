import webTester from '../../actor/webTester';
import { TransactionSubmittedPage } from '../../elements/newTransaction/transactionSubmittedPage';
import { TransactionErrorPage } from '../../elements/newTransaction/transactionErrorPage';
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
    const transactionErrorPage = new TransactionErrorPage();
    await webTester.seeElement(transactionErrorPage.mainTitle().toJSLocator(), false, 10_000);
    await webTester.seeWebElement(transactionErrorPage.subTitle());
    await webTester.seeWebElement(transactionErrorPage.subTitle2());

    await webTester.seeWebElement(new Button(await t('browserView.transaction.send.footer.fail')));
    await webTester.seeWebElement(new Button(await t('browserView.transaction.send.footer.cancel')));
  }
}

export default new TransactionSubmittedExtendedAssert();
