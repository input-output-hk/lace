/* eslint-disable no-undef*/
import CommonOnboardingElements from './commonOnboardingElements';
import { ChainablePromiseElement } from 'webdriverio';
import Banner from '../banner';

export class ConnectYourDevicePage extends CommonOnboardingElements {
  private LOADER_IMAGE = '[data-testid="loader-image"]';
  private ERROR_IMAGE = '[data-testid="error-image"]';

  get loader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOADER_IMAGE);
  }

  get errorImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ERROR_IMAGE);
  }

  get tryAgainButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.nextButton;
  }

  get banner(): typeof Banner {
    return Banner;
  }
}

export default new ConnectYourDevicePage();
