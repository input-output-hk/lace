/* eslint-disable no-undef */
import { DrawerCommonExtended } from '../../drawerCommonExtended';
import { WebElement } from '../../webElement';
import { ChainablePromiseElement } from 'webdriverio';

class TermsAndConditionsSettingsDrawer extends WebElement {
  baseDrawer: DrawerCommonExtended;
  private TERMS_AND_CONDITIONS_CONTENT = '[data-testid="terms-and-conditions-content"]';
  constructor() {
    super();
    this.baseDrawer = new DrawerCommonExtended();
  }
  get termsAndConditionsContent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TERMS_AND_CONDITIONS_CONTENT);
  }
}

export default new TermsAndConditionsSettingsDrawer();
