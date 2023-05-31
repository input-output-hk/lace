/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../../actor/webTester';
import { DrawerCommonExtended } from '../../drawerCommonExtended';
import { WebElement, WebElementFactory as Factory } from '../../webElement';

export class PrivacyPolicySettingsDrawer extends WebElement {
  baseDrawer: DrawerCommonExtended;
  private PRIVACY_POLICY_CONTENT = '//div[@data-testid="privacy-policy-content"]';
  constructor() {
    super();
    this.baseDrawer = new DrawerCommonExtended();
  }
  privacyPolicyContent(): WebElement {
    return Factory.fromSelector(`${this.baseDrawer.container().toJSLocator()}${this.PRIVACY_POLICY_CONTENT}`, 'xpath');
  }

  async getPrivacyPolicyContent(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.privacyPolicyContent());
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
