/* eslint-disable sonarjs/prefer-immediate-return */
/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';

export class TransactionCancelPopup extends WebElement {
  private CONTAINER = '//div[@class="ant-drawer-body"]';
  private CANCEL_TRANSACTION_FILLED_FIELDS_POPUP = '//div[@class="ant-modal-content"]';
  private CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_TITLE = '//div[@data-testid="delete-address-modal-title"]';
  private CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_TEXT = '//div[@data-testid="delete-address-modal-description"]';
  private CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_CANCEL_BUTTON = '//button[@data-testid="delete-address-modal-cancel"]';
  private CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_AGREE_BUTTON = '//button[@data-testid="delete-address-modal-confirm"]';

  cancelTxPopup(): WebElement {
    return Factory.fromSelector(`${this.CANCEL_TRANSACTION_FILLED_FIELDS_POPUP}`, 'xpath');
  }

  cancelTxPopupTitle(): WebElement {
    return Factory.fromSelector(`${this.CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_TITLE}`, 'xpath');
  }

  cancelTxPopupText(): WebElement {
    return Factory.fromSelector(`${this.CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_TEXT}`, 'xpath');
  }

  cancelTxPopupCancelBttn(): WebElement {
    return Factory.fromSelector(`${this.CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_CANCEL_BUTTON}`, 'xpath');
  }

  cancelTxPopupAgreeBttn(): WebElement {
    return Factory.fromSelector(`${this.CANCEL_TRANSACTION_FILLED_FIELDS_POPUP_AGREE_BUTTON}`, 'xpath');
  }

  async getCancelTxPopupTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.cancelTxPopupTitle());
  }

  async getCancelTxPopupText(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.cancelTxPopupText());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
