/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';
import type { NetworkType } from '../../types/network';

class NetworkDrawer extends CommonDrawerElements {
  private MAINNET_RADIO_BUTTON_INPUT = '//input[@data-testid="network-mainnet-radio-button"]';
  private MAINNET_RADIO_BUTTON_LABEL = '//label[span/input[@data-testid="network-mainnet-radio-button"]]';
  private PREPROD_RADIO_BUTTON_INPUT = '//input[@data-testid="network-preprod-radio-button"]';
  private PREPROD_RADIO_BUTTON_LABEL = '//label[span/input[@data-testid="network-preprod-radio-button"]]';
  private PREVIEW_RADIO_BUTTON_INPUT = '//input[@data-testid="network-preview-radio-button"]';
  private PREVIEW_RADIO_BUTTON_LABEL = '//label[span/input[@data-testid="network-preview-radio-button"]]';

  get mainnetRadioButtonLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAINNET_RADIO_BUTTON_LABEL);
  }

  get mainnetRadioButtonInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAINNET_RADIO_BUTTON_INPUT);
  }

  get preprodRadioButtonLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREPROD_RADIO_BUTTON_LABEL);
  }

  get preprodRadioButtonInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREPROD_RADIO_BUTTON_INPUT);
  }

  get previewRadioButtonLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIEW_RADIO_BUTTON_LABEL);
  }

  get previewRadioButtonInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PREVIEW_RADIO_BUTTON_INPUT);
  }

  clickOnNetworkRadioButton = async (network: NetworkType) => {
    switch (network) {
      case 'Mainnet':
        await this.mainnetRadioButtonInput.waitForClickable();
        await this.mainnetRadioButtonInput.click();
        break;
      case 'Preprod':
        await this.preprodRadioButtonInput.waitForClickable();
        await this.preprodRadioButtonInput.click();
        break;
      case 'Preview':
        await this.previewRadioButtonInput.waitForClickable();
        await this.previewRadioButtonInput.click();
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
