import CommonOnboardingElements from './commonOnboardingElements';

class AnalyticsPage extends CommonOnboardingElements {
  private TITLE = '[data-testid="wallet-setup-step-header"]';
  private DESCRIPTION = '[data-testid="wallet-setup-analytics-description"]';
  private DESCRIPTION_PRIVACY_POLICY_LINK = '[data-testid="wallet-setup-analytics-privacy-policy-link"]';
  private OPTIONS_TITLE = '[data-testid="wallet-setup-analytics-options-title"]';
  private OPTION_ALLOW_OPTOUT_ICON = '[data-testid="wallet-setup-analytics-options-allow-optout-icon"]';
  private OPTION_ALLOW_OPTOUT_TEXT = '[data-testid="wallet-setup-analytics-options-allow-optout-text"]';
  private OPTION_COLLECT_PRIVATE_KEYS_ICON = '[data-testid="wallet-setup-analytics-options-collect-private-keys-icon"]';
  private OPTION_COLLECT_PRIVATE_KEYS_TEXT = '[data-testid="wallet-setup-analytics-options-collect-private-keys-text"]';
  private OPTION_COLLECT_IP_ICON = '[data-testid="wallet-setup-analytics-options-collect-ip-icon"]';
  private OPTION_COLLECT_IP_TEXT = '[data-testid="wallet-setup-analytics-options-collect-ip-text"]';
  private OPTION_PERSONAL_DATA_ICON = '[data-testid="wallet-setup-analytics-options-personal-data-icon"]';
  private OPTION_PERSONAL_DATA_TEXT = '[data-testid="wallet-setup-analytics-options-personal-data-text"]';
  private SKIP_BUTTON = '[data-testid="wallet-setup-step-btn-skip"]';

  get title() {
    return $(this.TITLE);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get privacyPolicyLinkWithinDescription() {
    return $(this.DESCRIPTION_PRIVACY_POLICY_LINK);
  }

  get optionsTitle() {
    return $(this.OPTIONS_TITLE);
  }

  get optionsAllowOptoutIcon() {
    return $(this.OPTION_ALLOW_OPTOUT_ICON);
  }

  get optionsAllowOptoutText() {
    return $(this.OPTION_ALLOW_OPTOUT_TEXT);
  }

  get optionsCollectPrivateKeysIcon() {
    return $(this.OPTION_COLLECT_PRIVATE_KEYS_ICON);
  }

  get optionsCollectPrivateKeysText() {
    return $(this.OPTION_COLLECT_PRIVATE_KEYS_TEXT);
  }

  get optionsCollectIPIcon() {
    return $(this.OPTION_COLLECT_IP_ICON);
  }

  get optionsCollectIPText() {
    return $(this.OPTION_COLLECT_IP_TEXT);
  }

  get optionsPersonalDataIcon() {
    return $(this.OPTION_PERSONAL_DATA_ICON);
  }

  get optionsPersonalDataText() {
    return $(this.OPTION_PERSONAL_DATA_TEXT);
  }

  get skipButton() {
    return $(this.SKIP_BUTTON);
  }
}

export default new AnalyticsPage();
