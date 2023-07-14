import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseArray, ElementArray } from 'webdriverio';

class PrivacyPolicyDrawer extends CommonDrawerElements {
  private PRIVACY_POLICY_CONTENT = '[data-testid="privacy-policy-content"]';

  get privacyPolicyContent() {
    return $(this.PRIVACY_POLICY_CONTENT);
  }

  get paragraphs(): ChainablePromiseArray<ElementArray> {
    return $(this.PRIVACY_POLICY_CONTENT).$$('span');
  }
}

export default new PrivacyPolicyDrawer();
