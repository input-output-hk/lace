/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDappPageElements from './commonDappPageElements';

class InsufficientFundsDAppPage extends CommonDappPageElements {
  private IMAGE = '[data-testid="collateral-sad-face-icon"]';
  private DESCRIPTION = '[data-testid="collateral-not-enough-ada-error"]';
  private ADD_FUNDS_BUTTON = '[data-testid="collateral-button-add-funds"]';
  private CANCEL_BUTTON = '[data-testid="collateral-button-cancel"]';

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get addFundsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADD_FUNDS_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickAddFundsButton() {
    await this.addFundsButton.waitForClickable();
    await this.addFundsButton.click();
  }

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }
}

export default new InsufficientFundsDAppPage();
