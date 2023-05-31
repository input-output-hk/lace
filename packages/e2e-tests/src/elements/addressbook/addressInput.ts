import { LocatorStrategy } from '../../actor/webTester';
import { WebElement } from '../webElement';

export class AddressInput extends WebElement {
  toJSLocator(): string {
    return '//ion-textarea[@data-testid="text-area"]/div/textarea';
  }
  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
