import webTester, { LocatorStrategy } from '../../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../../webElement';

export class AddressAddNew extends WebElement {
  protected DRAWER;
  private CONTAINER = '//form[@data-testid="address-form"]';
  private TITLE_SELECTOR = '//div[contains(@class, "AddressForm-module_title")]';
  private FORM_TITLE_SELECTOR = '//div[@data-testid="drawer-header-title"]';
  private SUBTITLE_SELECTOR = '//div[contains(@class, "AddressForm-module_subTitle")]';
  private NAME_INPUT_SELECTOR = '//input[@data-testid="address-form-name-input"]';
  private ADDRESS_INPUT_SELECTOR =
    '//div[@data-testid="address-form-address-input"]//input[@data-testid="search-input"]';
  private SAVE_BUTTON_SELECTOR = '//button[contains(@class, "AddressForm-module_submitBtn")]';

  constructor(drawer: boolean) {
    super();
    this.DRAWER = drawer ? '//div[contains(@class, "ant-drawer-wrapper-body")]' : '';
  }

  title(): WebElement {
    return Factory.fromSelector(`${this.DRAWER}${this.CONTAINER}${this.TITLE_SELECTOR}`, 'xpath');
  }

  formTitle(): WebElement {
    return Factory.fromSelector(`${this.FORM_TITLE_SELECTOR}`, 'xpath');
  }

  subTitle(): WebElement {
    return Factory.fromSelector(`${this.DRAWER}${this.CONTAINER}${this.SUBTITLE_SELECTOR}`, 'xpath');
  }

  nameInput(): WebElement {
    return Factory.fromSelector(`${this.DRAWER}${this.CONTAINER}${this.NAME_INPUT_SELECTOR}`, 'xpath');
  }

  addressInput(): WebElement {
    return Factory.fromSelector(`${this.DRAWER}${this.CONTAINER}${this.ADDRESS_INPUT_SELECTOR}`, 'xpath');
  }

  saveButton(): WebElement {
    return Factory.fromSelector(`${this.DRAWER}${this.CONTAINER}${this.SAVE_BUTTON_SELECTOR}`, 'xpath');
  }

  async getAddressInputValue(): Promise<string | number> {
    return await webTester.getValue(this.addressInput().toJSLocator());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
