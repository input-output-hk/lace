import CommonOnboardingElements from './commonOnboardingElements';

class OnboardingLegalPage extends CommonOnboardingElements {
  private LEGAL_TEXT = '//div[@data-testid="wallet-setup-legal-text"]';
  private TERMS_CHECKBOX = 'input[data-testid="wallet-setup-legal-terms-checkbox"]';
  private TERMS_CHECKBOX_DESCRIPTION = '[data-testid="wallet-setup-legal-terms-checkbox-description"]';
  private TERMS_TOOLTIP = '//div[@role="tooltip"]';

  get legalText() {
    return $(this.LEGAL_TEXT);
  }

  get termsCheckbox() {
    return $(this.TERMS_CHECKBOX);
  }

  get termsCheckboxDescription() {
    return $(this.TERMS_CHECKBOX_DESCRIPTION);
  }

  get termsTooltip() {
    return $(this.TERMS_TOOLTIP);
  }
}

export default new OnboardingLegalPage();
