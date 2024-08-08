/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class CommonDrawerElements {
  private DRAWER_BODY = '.ant-drawer-body';
  private AREA_OUTSIDE_DRAWER = '.ant-drawer-mask';
  public DRAWER_HEADER_MENU = '[data-testid="header-menu"]';
  public DRAWER_NAVIGATION_TITLE = '[data-testid="drawer-navigation-title"]';
  public DRAWER_HEADER_BACK_BUTTON = '[data-testid="navigation-button-arrow"]';
  public DRAWER_HEADER_CLOSE_BUTTON = '[data-testid="navigation-button-cross"]';
  public DRAWER_HEADER_TITLE = '[data-testid="drawer-header-title"]';
  private DRAWER_HEADER_SUBTITLE = '[data-testid="drawer-header-subtitle"]';

  get drawerBody(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_BODY);
  }

  get drawerNavigationTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_NAVIGATION_TITLE);
  }

  get drawerHeaderBackButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DRAWER_HEADER_MENU).$(this.DRAWER_HEADER_BACK_BUTTON);
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

  get areaOutsideDrawer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AREA_OUTSIDE_DRAWER);
  }

  async clickHeaderBackButton(): Promise<void> {
    await this.drawerHeaderBackButton.waitForClickable();
    await this.drawerHeaderBackButton.click();
  }

  async clickHeaderCloseButton(): Promise<void> {
    await this.drawerHeaderCloseButton.waitForClickable();
    await this.drawerHeaderCloseButton.click();
  }

  async clickCloseDrawerButton(): Promise<void> {
    await this.drawerHeaderCloseButton.waitForClickable({ timeout: 15_000 });
    await this.drawerHeaderCloseButton.click();
  }

  async clickBackDrawerButton(): Promise<void> {
    await this.drawerHeaderBackButton.waitForClickable({ timeout: 15_000 });
    await this.drawerHeaderBackButton.click();
  }
}

export default CommonDrawerElements;
