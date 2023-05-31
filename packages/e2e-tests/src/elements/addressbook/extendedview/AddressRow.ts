/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../../webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class AddressRow extends WebElement {
  protected SELECTED_LIST_ITEM: string;
  private CONTAINER = '//div[@data-testid="address-list"]';
  private LIST_ITEM_SELECTOR = '//div[@data-testid="address-list-item"]';
  private AVATAR_SELECTOR = '//div[@data-testid="address-list-item-avatar"]';
  private NAME_SELECTOR = '//div[@data-testid="address-list-item-name"]';
  private ADDRESS_SELECTOR = '//div[@data-testid="address-list-item-address"]/p';

  constructor(addressName: string) {
    super();
    this.SELECTED_LIST_ITEM = `${this.LIST_ITEM_SELECTOR}[.//span[contains(text(), '${addressName}')]]`;
  }

  avatarElement(): WebElement {
    return Factory.fromSelector(`${this.SELECTED_LIST_ITEM}${this.AVATAR_SELECTOR}`, 'xpath');
  }

  nameElement(): WebElement {
    return Factory.fromSelector(`${this.SELECTED_LIST_ITEM}${this.NAME_SELECTOR}`, 'xpath');
  }

  get addressElement(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.SELECTED_LIST_ITEM}${this.ADDRESS_SELECTOR}`);
  }

  async getName(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.nameElement());
  }

  async getAddress(): Promise<string> {
    return this.addressElement.getText();
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
