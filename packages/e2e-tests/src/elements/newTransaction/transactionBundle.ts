/* eslint-disable no-undef */
import { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { AddressInput } from '../AddressInput';
import { AssetInput } from './assetInput';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionBundle extends WebElement {
  protected CONTAINER = '//div[@data-testid="asset-bundle-container"]';
  private BUNDLE_TITLE = '//h5[@data-testid="asset-bundle-title"]';
  private BUNDLE_REMOVE_BUTTON = '//button[@data-testid="asset-bundle-remove-button"]';
  private ADDRESS_INPUT_ERROR = '[data-testid="address-input-error"]';

  constructor(index?: number) {
    super();
    this.CONTAINER = typeof index === 'undefined' ? this.CONTAINER : `(${this.CONTAINER})[${index}]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  bundleTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.BUNDLE_TITLE}`, 'xpath');
  }

  bundleAddressInput(): AddressInput {
    return new AddressInput();
  }

  get bundleAddressInputError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.ADDRESS_INPUT_ERROR);
  }

  bundleAssetInput(): AssetInput {
    return new AssetInput();
  }

  bundleRemoveButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.BUNDLE_REMOVE_BUTTON}`, 'xpath');
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
