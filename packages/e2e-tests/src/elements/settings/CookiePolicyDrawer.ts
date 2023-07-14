import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseArray, ElementArray } from 'webdriverio';

class CookiePolicyDrawer extends CommonDrawerElements {
  private readonly COOKIE_POLICY_CONTENT = '[data-testid="cookie-policy-content"]';

  get cookiePolicyContent() {
    return $(this.COOKIE_POLICY_CONTENT);
  }

  get paragraphs(): ChainablePromiseArray<ElementArray> {
    return $(this.COOKIE_POLICY_CONTENT).$$('p');
  }
}

export default new CookiePolicyDrawer();
