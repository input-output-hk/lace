/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';
import type { NetworkType } from '../../types/network';

class NetworkDrawer extends CommonDrawerElements {
  private MAINNET_RADIO_BUTTON_INPUT = '//input[@data-testid="network-mainnet-radio-button"]';
  private MAINNET_RADIO_BUTTON = '//label[span/input[@data-testid="network-mainnet-radio-button"]]';
  private PREPROD_RADIO_BUTTON_INPUT = '//input[@data-testid="network-preprod-radio-button"]';
  private PREPROD_RADIO_BUTTON = '//label[span/input[@data-testid="network-preprod-radio-button"]]';
  private PREVIEW_RADIO_BUTTON_INPUT = '//input[@data-testid="network-preview-radio-button"]';
  private PREVIEW_RADIO_BUTTON = '//label[span/input[@data-testid="network-preview-radio-button"]]';

  get mainnetRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAINNET_RADIO_BUTTON);
  }

  get mainnetRadioButtonInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAINNET_RADIO_BUTTON_INPUT);
  }

  get preprodRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREPROD_RADIO_BUTTON);
  }

  get preprodRadioButtonInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREPROD_RADIO_BUTTON_INPUT);
  }

  get previewRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIEW_RADIO_BUTTON);
  }

  get previewRadioButtonInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIEW_RADIO_BUTTON_INPUT);
  }

  clickOnNetworkRadioButton = async (network: NetworkType) => {
    switch (network) {
      case 'Mainnet':
        await this.mainnetRadioButton.waitForClickable();
        await this.mainnetRadioButton.click();
        break;
      case 'Preprod':
        await this.preprodRadioButton.waitForClickable();
        await this.preprodRadioButton.click();
        break;
      case 'Preview':
        await this.previewRadioButton.waitForClickable();
        await this.previewRadioButton.click();
        break;
    }
  };

  isNetworkSelected = async (network: NetworkType) => {
    switch (network) {
      case 'Mainnet':
        return await this.mainnetRadioButtonInput.isSelected();
      case 'Preprod':
        return await this.preprodRadioButtonInput.isSelected();
      case 'Preview':
        return await this.previewRadioButtonInput.isSelected();
      default:
        return false;
    }
  };
}

export default new NetworkDrawer();
