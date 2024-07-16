/* eslint-disable no-undef */
import { AddressInput } from '../AddressInput';
import { AssetInput } from './assetInput';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionBundle {
  protected CONTAINER = '//div[@data-testid="asset-bundle-container"]';
  private BUNDLE_TITLE = '//h5[@data-testid="asset-bundle-title"]';
  private BUNDLE_REMOVE_BUTTON = '//button[@data-testid="asset-bundle-remove-button"]';
  private ADDRESS_INPUT_ERROR = '[data-testid="address-input-error"]';
  readonly index: number = 1;

  constructor(index = 1) {
    this.index = index;
    this.CONTAINER = `(${this.CONTAINER})[${index}]`;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get bundleTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.BUNDLE_TITLE}`);
  }

  get bundleAddressInput(): AddressInput {
    return new AddressInput(this.index);
  }

  get bundleAddressInputError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.ADDRESS_INPUT_ERROR);
  }

  get bundleAssetInput(): AssetInput {
    return new AssetInput(this.index);
  }

  get bundleRemoveButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.BUNDLE_REMOVE_BUTTON}`);
  }

  clickRemoveBundleButton = async (): Promise<void> => {
    await this.bundleRemoveButton.waitForClickable();
    await this.bundleRemoveButton.click();
  };
}
