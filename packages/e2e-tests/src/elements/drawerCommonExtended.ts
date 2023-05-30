import webTester, { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';
import { Button } from './button';

export class DrawerCommonExtended extends WebElement {
  private CONTAINER = '(//div[@class="ant-drawer-content-wrapper"])[last()]';
  private TITLE_SELECTOR = '//div[@data-testid="drawer-header-title"]';
  private CLOSE_BUTTON = '//button[@data-testid="navigation-button-cross"]';
  private BACK_BUTTON = '//button[@data-testid="navigation-button-arrow"]';
  private TOKEN_INFO_BUTTON = '//ion-button[@data-testid="asset-info-button"]';
  private DRAWER_BODY_CONTAINER = '//div[@class="ant-drawer-wrapper-body"]';
  private AREA_OUTSIDE_DRAWER = '.ant-drawer-mask';

  constructor() {
    super();
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  titleElement(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TITLE_SELECTOR}`, 'xpath');
  }

  closeButton(): WebElement {
    return Factory.fromSelector(`${this.CLOSE_BUTTON}`, 'xpath');
  }

  backButton(): WebElement {
    return Factory.fromSelector(`${this.BACK_BUTTON}`, 'xpath');
  }

  drawerButton(buttonText: string): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${new Button(buttonText).toJSLocator()}`, 'xpath');
  }

  drawerBodyContainer(): WebElement {
    return Factory.fromSelector(`${this.DRAWER_BODY_CONTAINER}`, 'xpath');
  }

  tokenInfoButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.TOKEN_INFO_BUTTON}`, 'xpath');
  }

  areaOutsideDrawer(): WebElement {
    return Factory.fromSelector(this.AREA_OUTSIDE_DRAWER, 'css selector');
  }

  async getTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.titleElement());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
