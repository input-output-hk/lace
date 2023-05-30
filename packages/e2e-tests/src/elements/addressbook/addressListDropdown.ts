import { WebElement } from '../webElement';

export class AddressListDropdown extends WebElement {
  toJSLocator(): string {
    return '[data-testid="address-list"]';
  }
}
