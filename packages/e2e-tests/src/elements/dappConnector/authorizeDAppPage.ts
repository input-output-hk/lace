/* eslint-disable no-undef */
import Banner from '../banner';
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class AuthorizeDAppPage {
  private HEADER_LOGO = '[data-testid="header-logo"]';
  private BETA_PILL = '[data-testid="beta-pill"]';
  private PAGE_TITLE = '[data-testid="layout-title"]';
  private DAPP_LOGO = '[data-testid="dapp-info-logo"]';
  private DAPP_NAME = '[data-testid="dapp-info-name"]';
  private DAPP_URL = '[data-testid="dapp-info-url"]';
  private PERMISSIONS_TITLE = '[data-testid="authorize-dapp-title"]';
  private PERMISSIONS_LIST = '[data-testid="authorize-dapp-permissions"]';
  private AUTHORIZE_BUTTON = '[data-testid="connect-authorize-button"]';
  private CANCEL_BUTTON = '[data-testid="connect-cancel-button"]';

  get headerLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADER_LOGO);
  }

  get betaPill(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BETA_PILL);
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

  get banner(): typeof Banner {
    return Banner;
  }

  get permissionsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PERMISSIONS_TITLE);
  }

  get permissionsList(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PERMISSIONS_LIST);
  }

  get permissionsListItems(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(`${this.PERMISSIONS_LIST} li`);
  }

  get authorizeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AUTHORIZE_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }
}

export default new AuthorizeDAppPage();
