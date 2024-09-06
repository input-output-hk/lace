/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class CommonDappPageElements {
  private HEADER_LOGO = '[data-testid="header-logo"]';
  private PAGE_TITLE = '[data-testid="layout-title"]';
  private DAPP_LOGO = '[data-testid="dapp-info-logo"]';
  private DAPP_NAME = '[data-testid="dapp-info-name"]';
  private DAPP_URL = '[data-testid="dapp-info-url"]';

  get headerLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADER_LOGO);
  }

  get pageTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAGE_TITLE);
  }

  get dAppLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DAPP_LOGO);
  }

  get dAppName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DAPP_NAME);
  }

  get dAppUrl(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DAPP_URL);
  }
}

export default CommonDappPageElements;
