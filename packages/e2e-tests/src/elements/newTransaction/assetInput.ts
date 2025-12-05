/* eslint-disable no-undef */
import { CoinConfigure } from './coinConfigure';
import { ChainablePromiseElement } from 'webdriverio';

export class AssetInput {
  private CONTAINER = '//div[@data-testid="asset-input-container"]';
  private ASSET_ADD_BUTTON = '//button[@data-testid="asset-add-button"]';
  index;

  constructor(index = 1) {
    this.index = index;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`(${this.CONTAINER})[${this.index}]`);
  }

  get assetAddButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`(${this.ASSET_ADD_BUTTON})[${this.index}]`);
  }

  coinConfigure(bundleIndex?: number, tokenName?: string): CoinConfigure {
    return new CoinConfigure(bundleIndex, tokenName);
  }

  async clickAddAssetButton(): Promise<void> {
    await this.assetAddButton.waitForStable();
    await this.assetAddButton.click();
  }
}
