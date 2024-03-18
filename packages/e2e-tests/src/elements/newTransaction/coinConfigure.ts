/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { setInputFieldValue } from '../../utils/inputFieldUtils';
import { browser } from '@wdio/globals';

export class CoinConfigure {
  protected CONTAINER_BUNDLE = '//div[@data-testid="asset-bundle-container"]';
  protected CONTAINER = '//div[@data-testid="coin-configure"]';
  private TOKEN_NAME = '//div[@data-testid="coin-configure-text"]';
  private TOKEN_VALUE = '//p[@data-testid="coin-configure-balance"]';
  private TOKEN_INPUT = '//input[@data-testid="coin-configure-input"]';
  private TOKEN_FIAT_VALUE = '//p[@data-testid="coin-configure-fiat-value"]';
  private ASSET_REMOVE_BUTTON = '//div[@data-testid="asset-input-remove-button"]';
  private INSUFFICIENT_BALANCE_ERROR = '//span[@data-testid="coin-configure-error-message"]';
  private TOOLTIP = 'div.ant-tooltip-inner';
  private MAX_BUTTON = '//button[@data-testid="max-bttn"]';

  constructor(bundleIndex = 1, assetName?: string) {
    this.CONTAINER =
      typeof assetName === 'undefined'
        ? `(${this.CONTAINER_BUNDLE})[${bundleIndex}]${this.CONTAINER}`
        : `(${this.CONTAINER_BUNDLE})[${bundleIndex}]//div[contains(@data-testid-title,"${assetName}")]`;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}`);
  }

  get nameElement(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKEN_NAME}`);
  }

  get balanceValueElement(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKEN_VALUE}`);
  }

  get balanceFiatValueElement(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKEN_FIAT_VALUE}`);
  }

  get input(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKEN_INPUT}`);
  }

  get assetRemoveButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(String(`${this.CONTAINER}/following-sibling::${this.ASSET_REMOVE_BUTTON.slice(2)}`));
  }

  get insufficientBalanceError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.INSUFFICIENT_BALANCE_ERROR}`);
  }

  get assetMaxButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.MAX_BUTTON}`);
  }

  get tooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP);
  }

  getAmount = async (): Promise<number> => {
    const value = await $(`${this.CONTAINER}${this.TOKEN_INPUT}`).getValue();
    return Number(value);
  };

  fillTokenValue = async (valueToEnter: number): Promise<void> => {
    await this.input.waitForClickable();
    await setInputFieldValue(await this.input, String(valueToEnter));
  };

  fillTokenValueUsingKeys = async (valueToEnter: number): Promise<void> => {
    await this.input.waitForClickable();
    await this.input.click();
    await browser.keys(String(valueToEnter));
  };

  fillTokenValueWithoutClearingField = async (valueToEnter: number): Promise<void> => {
    await this.input.waitForClickable();
    await this.input.click();
    for (const digit of valueToEnter.toString()) {
      await browser.pause(50);
      await browser.keys(digit);
    }
  };

  hoverOverTheTokenValue = async (): Promise<void> => {
    await this.input.waitForStable();
    await this.input.moveTo();
  };

  hoverOverTheTokenName = async (): Promise<void> => {
    await this.nameElement.waitForStable();
    await this.nameElement.moveTo();
  };

  clickRemoveAssetButton = async (): Promise<void> => {
    await this.assetRemoveButton.click();
  };

  clickMaxButton = async (): Promise<void> => {
    await this.input.waitForStable();
    await this.input.waitForClickable();
    await this.input.clearValue();
    await this.input.moveTo();
    await this.assetMaxButton.click();
  };

  clickToLoseFocus = async (): Promise<void> => {
    await this.container.click();
  };

  clickCoinSelectorName = async (): Promise<void> => {
    await this.nameElement.waitForClickable();
    await this.nameElement.click();
    await browser.pause(500);
  };
}
