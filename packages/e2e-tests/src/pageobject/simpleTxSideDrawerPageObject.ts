import webTester from '../actor/webTester';
import PasswordInput from '../elements/passwordInput';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import CommonDrawerElements from '../elements/CommonDrawerElements';
import TransactionPasswordPage from '../elements/newTransaction/transactionPasswordPage';

class SimpleTxSideDrawerPageObject {
  fillTokenValue = async (value: string) => {
    await webTester.fillComponent(new TransactionNewPage().coinConfigure().input(), value);
  };

  clickCloseDrawerButton = async () => {
    const commonDrawerElements = new CommonDrawerElements();
    await commonDrawerElements.drawerHeaderCloseButton.waitForClickable();
    await commonDrawerElements.drawerHeaderCloseButton.click();
  };

  clickBackDrawerButton = async () => {
    const commonDrawerElements = new CommonDrawerElements();
    await commonDrawerElements.drawerHeaderBackButton.waitForClickable();
    await commonDrawerElements.drawerHeaderBackButton.click();
  };

  async fillPassword(password: string) {
    await PasswordInput.input.setValue(password);
  }

  async fillPasswordAndConfirm(password: string) {
    await TransactionPasswordPage.passwordInput.setValue(password);
    await TransactionPasswordPage.nextButton.waitForClickable();
    await TransactionPasswordPage.nextButton.click();
  }
}

export default new SimpleTxSideDrawerPageObject();
