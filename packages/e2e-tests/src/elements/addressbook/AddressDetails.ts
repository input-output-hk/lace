/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class AddressDetails extends CommonDrawerElements {
  private ADDRESS_DETAILS_CONTAINER = '[data-testid="address-form-details-container"]';
  private NAME = '[data-testid="address-form-details-name"]';
  private ADDRESS = '[data-testid="address-form-details-address"]';
  private COPY_BUTTON = '[data-testid="address-form-details-copy"]';
  private EDIT_BUTTON = '[data-testid="address-form-details-btn-edit"]';
  private DELETE_BUTTON = '[data-testid="address-form-details-btn-delete"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS_DETAILS_CONTAINER);
  }

  get name(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NAME);
  }

  get address(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS);
  }

  get copyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COPY_BUTTON);
  }

  get editButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EDIT_BUTTON);
  }

  get deleteButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELETE_BUTTON);
  }
}

export default new AddressDetails();
