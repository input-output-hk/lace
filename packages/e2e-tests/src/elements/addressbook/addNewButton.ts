import { WebElement } from '../webElement';

export class AddNewButton extends WebElement {
  toJSLocator(): string {
    return '[data-testid="message-footer-btn"]';
  }
}
