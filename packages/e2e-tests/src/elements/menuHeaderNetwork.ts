/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import NetworkDrawer from './settings/NetworkDrawer';

export class MenuHeaderNetwork {
  private CONTAINER = '[data-testid="user-dropdown-network-info-section"]';
  private TITLE = '[data-testid="user-dropdown-network-title"]';
  private DESCRIPTION = '[data-testid="user-dropdown-network-description"]';
  private BACK_BUTTON = '[data-testid="navigation-button-arrow"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BACK_BUTTON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get mainnetRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return NetworkDrawer.mainnetRadioButton;
  }

  get preprodRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return NetworkDrawer.preprodRadioButton;
  }

  get previewRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return NetworkDrawer.previewRadioButton;
  }
}

export default new MenuHeaderNetwork();
