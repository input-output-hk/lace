/* eslint-disable no-undef */
import CommonDrawerElements from '../../CommonDrawerElements';
import { ChainablePromiseElement } from 'webdriverio';

class PrivacyPolicySettingsDrawer extends CommonDrawerElements {
  private PRIVACY_POLICY_CONTENT = '[data-testid="privacy-policy-content"]';

  get privacyPolicyContent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRIVACY_POLICY_CONTENT);
  }
}

export default new PrivacyPolicySettingsDrawer();
