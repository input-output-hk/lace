import CommonDrawerElements from '../CommonDrawerElements';

class PrivacyPolicySettingsDrawer extends CommonDrawerElements {
  private PRIVACY_POLICY_CONTENT = '[data-testid="privacy-policy-content"]';

  get privacyPolicyContent() {
    return $(this.PRIVACY_POLICY_CONTENT);
  }
}

export default new PrivacyPolicySettingsDrawer();
