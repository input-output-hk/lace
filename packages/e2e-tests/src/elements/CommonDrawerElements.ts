/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class CommonDrawerElements {
  private DRAWER_BODY = '.ant-drawer-body';
  private DRAWER_NAVIGATION_TITLE = '[data-testid="drawer-navigation-title"]';
  private DRAWER_HEADER_BACK_BUTTON = '[data-testid="navigation-button-arrow"]';
  private DRAWER_HEADER_CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';
  private DRAWER_HEADER_TITLE = '[data-testid="drawer-header-title"]';
  private DRAWER_HEADER_SUBTITLE = '[data-testid="drawer-header-subtitle"]';

  get drawerBody(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_BODY);
  }

  get drawerNavigationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_NAVIGATION_TITLE);
  }

  get drawerHeaderBackButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_BACK_BUTTON);
  }

  get drawerHeaderCloseButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_CLOSE_BUTTON);
  }

  get drawerHeaderTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_TITLE);
  }

  get drawerHeaderSubtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_SUBTITLE);
  }
}

export default CommonDrawerElements;
