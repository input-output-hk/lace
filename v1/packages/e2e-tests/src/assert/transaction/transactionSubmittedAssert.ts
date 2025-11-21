import TransactionSubmittedPage from '../../elements/newTransaction/transactionSubmittedPage';
import TransactionErrorPage from '../../elements/newTransaction/transactionErrorPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class TransactionSubmittedAssert {
  async assertSeeTransactionSubmittedPage(mode: 'extended' | 'popup') {
    await TransactionSubmittedPage.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      expect(await TransactionSubmittedPage.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.assets.send')
      );
    }
    await TransactionSubmittedPage.drawerHeaderCloseButton.waitForDisplayed();
    await TransactionSubmittedPage.image.waitForDisplayed();
    await TransactionSubmittedPage.title.waitForDisplayed();
    expect(await TransactionSubmittedPage.title.getText()).to.equal(
      await t('browserView.transaction.success.youCanSafelyCloseThisPanel')
    );
    await TransactionSubmittedPage.subtitle.waitForDisplayed();
    expect(await TransactionSubmittedPage.subtitle.getText()).to.equal(
      await t('browserView.transaction.success.thisMayTakeAFewMinutes')
    );

    await TransactionSubmittedPage.txHash.waitForDisplayed();

    await TransactionSubmittedPage.viewTransactionButton.waitForDisplayed();
    expect(await TransactionSubmittedPage.viewTransactionButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.viewTransaction')
    );
    await TransactionSubmittedPage.closeButton.waitForDisplayed();
    expect(await TransactionSubmittedPage.closeButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.close')
    );
  }

  async assertSeeTransactionErrorPage(mode: 'extended' | 'popup') {
    await TransactionErrorPage.drawerNavigationTitle.waitForDisplayed({ reverse: mode === 'popup' });
    if (mode === 'extended') {
      expect(await TransactionErrorPage.drawerNavigationTitle.getText()).to.equal(await t('browserView.assets.send'));
    }
    await TransactionErrorPage.drawerHeaderCloseButton.waitForDisplayed();
    await TransactionErrorPage.mainTitle.waitForDisplayed({ timeout: 10_000 });
    expect(await TransactionErrorPage.mainTitle.getText()).to.equal(
      await t('browserView.transaction.fail.oopsSomethingWentWrong')
    );
    await TransactionErrorPage.descriptionLine1.waitForDisplayed();
    expect(await TransactionErrorPage.descriptionLine1.getText()).to.equal(
      await t('browserView.transaction.fail.problemSubmittingYourTransaction')
    );
    await TransactionErrorPage.descriptionLine2.waitForDisplayed();
    expect(await TransactionErrorPage.descriptionLine2.getText()).to.equal(
      await t('browserView.transaction.fail.clickBackAndTryAgain')
    );

    await TransactionErrorPage.image.waitForDisplayed();

    await TransactionErrorPage.cancelButton.waitForDisplayed();
    expect(await TransactionErrorPage.cancelButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.cancel')
    );
    await TransactionErrorPage.backButton.waitForDisplayed();
    expect(await TransactionErrorPage.backButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.fail')
    );
  }
}

export default new TransactionSubmittedAssert();
