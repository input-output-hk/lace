import webTester from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';

export class AddressCount extends WebElement {
  private COUNTER = '//*[@id="popupAddressBookContainerId"]/div/h1/span';

  constructor() {
    super();
  }

  counterElement(): WebElement {
    return Factory.fromSelector(`${this.COUNTER}`, 'xpath');
  }

  async getCounter(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.counterElement());
  }
}
