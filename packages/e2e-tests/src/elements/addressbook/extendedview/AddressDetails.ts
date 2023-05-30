import webTester, { LocatorStrategy } from '../../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../../webElement';

export class AddressDetails extends WebElement {
  private CONTAINER = '//div[@data-testid="address-form-details-container"]';
  private TITLE_SELECTOR = '//div[@data-testid="drawer-header-title"]';
  private NAME_SELECTOR = '//div[@data-testid="address-form-details-name"]';
  private ADDRESS_SELECTOR = '//div[@data-testid="address-form-details-address"]';
  private COPY_BUTTON_SELECTOR = '//button[@data-testid="address-form-details-copy"]';
  private EDIT_BUTTON_SELECTOR = '//button[@data-testid="address-form-details-btn-edit"]';
  private DELETE_BUTTON_SELECTOR = '//button[@data-testid="address-form-details-btn-delete"]';

  constructor() {
    super();
  }

  title(): WebElement {
    return Factory.fromSelector(`${this.TITLE_SELECTOR}`, 'xpath');
  }

  name(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.NAME_SELECTOR}`, 'xpath');
  }

  address(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.ADDRESS_SELECTOR}`, 'xpath');
  }

  copyButton(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.COPY_BUTTON_SELECTOR}`, 'xpath');
  }

  editButton(): WebElement {
    return Factory.fromSelector(`${this.EDIT_BUTTON_SELECTOR}`, 'xpath');
  }

  deleteButton(): WebElement {
    return Factory.fromSelector(`${this.DELETE_BUTTON_SELECTOR}`, 'xpath');
  }

  async getName(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.name());
  }

  async getAddress(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.address());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
