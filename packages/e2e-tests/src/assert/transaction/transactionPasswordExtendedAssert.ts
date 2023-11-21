import TransactionPasswordPage from '../../elements/newTransaction/transactionPasswordPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class TransactionPasswordExtendedAssert {
  assertSeePasswordPage = async () => {
    await TransactionPasswordPage.headerTitle.waitForDisplayed();
    expect(await TransactionPasswordPage.headerTitle.getText()).to.equal(
      await t('browserView.transaction.send.confirmationTitle')
    );
    await TransactionPasswordPage.headerSubtitle.waitForDisplayed();
    expect(await TransactionPasswordPage.headerSubtitle.getText()).to.equal(
      await t('browserView.transaction.send.signTransactionWithPassword')
    );
    await TransactionPasswordPage.passwordInput.waitForDisplayed();
    await TransactionPasswordPage.passwordShowHideButton.waitForDisplayed();

    await TransactionPasswordPage.nextButton.waitForDisplayed();
    expect(await TransactionPasswordPage.nextButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.confirm')
    );
    await TransactionPasswordPage.cancelButton.waitForDisplayed();
    expect(await TransactionPasswordPage.cancelButton.getText()).to.equal(
      await t('browserView.transaction.send.footer.cancel')
    );
  };
}

export default new TransactionPasswordExtendedAssert();
