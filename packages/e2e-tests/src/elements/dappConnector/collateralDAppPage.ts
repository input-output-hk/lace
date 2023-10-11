/* eslint-disable no-undef */
import Banner from '../banner';
import { ChainablePromiseElement } from 'webdriverio';
import CommonDappPageElements from './commonDappPageElements';

class CollateralDAppPage extends CommonDappPageElements {
  private MODAL_DESCRIPTION = '[data-testid="collateral-modal-description"]';
  private ACCEPT_BUTTON = '[data-testid="collateral-set-accept"]';
  private CANCEL_BUTTON = '[data-testid="collateral-set-cancel"]';

  get banner(): typeof Banner {
    return Banner;
  }

  get modalDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MODAL_DESCRIPTION);
  }

  get acceptButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACCEPT_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickAcceptButton() {
    await this.acceptButton.waitForClickable();
    await this.acceptButton.click();
  }

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }
}

export default new CollateralDAppPage();
