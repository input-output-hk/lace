import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import CommonDrawerElements from '../elements/CommonDrawerElements';
import TransactionPasswordPage from '../elements/newTransaction/transactionPasswordPage';
import TransactionSubmittedPage from '../elements/newTransaction/transactionSubmittedPage';
import { setInputFieldValue } from '../utils/inputFieldUtils';

class SimpleTxSideDrawerPageObject {
  fillTokenValue = async (value: string) => {
    await setInputFieldValue(new TransactionNewPage().coinConfigure().input().toJSLocator(), value);
  };

  clickCloseDrawerButton = async () => {
    const commonDrawerElements = new CommonDrawerElements();
    await commonDrawerElements.drawerHeaderCloseButton.waitForClickable({ timeout: 15_000 });
    await commonDrawerElements.drawerHeaderCloseButton.click();
  };

  clickCloseAllDoneDrawerButton = async () => {
    await TransactionSubmittedPage.closeButton.click();
  };

  clickBackDrawerButton = async () => {
    const commonDrawerElements = new CommonDrawerElements();
    await commonDrawerElements.drawerHeaderBackButton.waitForClickable({ timeout: 15_000 });
    await commonDrawerElements.drawerHeaderBackButton.click();
  };

  async fillPasswordAndConfirm(password: string) {
    await TransactionPasswordPage.passwordInput.setValue(password);
    await TransactionPasswordPage.nextButton.waitForClickable();
    await TransactionPasswordPage.nextButton.click();
    await TransactionPasswordPage.buttonLoader.waitForDisplayed({ timeout: 20_000, reverse: true });
  }
}

export default new SimpleTxSideDrawerPageObject();
