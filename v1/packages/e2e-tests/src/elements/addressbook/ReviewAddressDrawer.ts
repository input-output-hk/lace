/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import Banner from '../banner';
import type { ChainablePromiseElement } from 'webdriverio';

class ReviewAddressDrawer extends CommonDrawerElements {
  private PREVIOUS_ADDRESS_TITLE = '[data-testid="previous-address-title"]';
  private PREVIOUS_ADDRESS_VALUE = '[data-testid="previous-address-value"]';
  private PREVIOUS_ADDRESS_COPY_BUTTON = '[data-testid="previous-address-copy-button"]';
  private NEW_ADDRESS_TITLE = '[data-testid="new-address-title"]';
  private NEW_ADDRESS_VALUE = '[data-testid="new-address-value"]';
  private NEW_ADDRESS_COPY_BUTTON = '[data-testid="new-address-copy-button"]';
  private ACCEPT_BUTTON = '[data-testid="send-next-btn"]';
  private DELETE_BUTTON = '[data-testid="send-cancel-btn"]';

  get banner(): typeof Banner {
    return Banner;
  }

  get previousAddressTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIOUS_ADDRESS_TITLE);
  }

  get previousAddressValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIOUS_ADDRESS_VALUE);
  }

  get previousAddressCopyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIOUS_ADDRESS_COPY_BUTTON);
  }

  get newAddressTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEW_ADDRESS_TITLE);
  }

  get newAddressValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEW_ADDRESS_VALUE);
  }

  get newAddressCopyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEW_ADDRESS_COPY_BUTTON);
  }

  get acceptAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACCEPT_BUTTON);
  }

  get deleteAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELETE_BUTTON);
  }

  async clickAcceptButton() {
    await this.acceptAddressButton.waitForClickable();
    await this.acceptAddressButton.click();
  }

  async clickDeleteButton() {
    await this.deleteAddressButton.waitForClickable();
    await this.deleteAddressButton.click();
  }
}

export default new ReviewAddressDrawer();
