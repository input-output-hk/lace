import webTester from '../actor/webTester';
import PasswordInput from '../elements/passwordInput';
import { TransactionNewPage } from '../elements/newTransaction/transactionNewPage';
import { t } from '../utils/translationService';
import CommonDrawerElements from '../elements/CommonDrawerElements';

class SimpleTxSideDrawerPageObject {
  fillTokenValue = async (value: string) => {
    await webTester.fillComponent(new TransactionNewPage().coinConfigure().input(), value);
  };

  clickCloseDrawerButton = async () => {
    const commonDrawerElements = new CommonDrawerElements();
    await commonDrawerElements.closeButton.waitForClickable();
    await commonDrawerElements.closeButton.click();
  };

  clickBackDrawerButton = async () => {
    const commonDrawerElements = new CommonDrawerElements();
    await commonDrawerElements.backButton.waitForClickable();
    await commonDrawerElements.backButton.click();
  };

  async fillPassword(password: string) {
    await PasswordInput.input.setValue(password);
  }

  async fillPasswordAndConfirm(password: string) {
    await this.fillPassword(password);
    await webTester.clickButton(await t('general.button.confirm'));
  }
}

export default new SimpleTxSideDrawerPageObject();
