/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class CommonDrawerElements {
  private DRAWER_NAVIGATION_TITLE = '[data-testid="drawer-navigation-title"]';
  private BACK_BUTTON = '[data-testid="navigation-button-arrow"]';
  private CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';
  private DRAWER_HEADER_TITLE = '[data-testid="drawer-header-title"]';
  private DRAWER_HEADER_SUBTITLE = '[data-testid="drawer-header-subtitle"]';

  get drawerNavigationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_NAVIGATION_TITLE);
  }

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BACK_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get drawerHeaderTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_TITLE);
  }

  get drawerHeaderSubtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_SUBTITLE);
  }
}

export default CommonDrawerElements;
