/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDappPageElements from './commonDappPageElements';
import PasswordInput from '../passwordInput';

class SignTransactionPage extends CommonDappPageElements {
  private DESCRIPTION = '[data-testid="sign-transaction-description"]';
  private CONFIRM_BUTTON = '[data-testid="sign-transaction-confirm"]';
  private CANCEL_BUTTON = '[data-testid="sign-transaction-cancel"]';

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get passwordInput(): typeof PasswordInput {
    return PasswordInput;
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }
}

export default new SignTransactionPage();
