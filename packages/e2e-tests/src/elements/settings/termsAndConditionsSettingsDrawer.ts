import CommonDrawerElements from '../CommonDrawerElements';

class TermsAndConditionsSettingsDrawer extends CommonDrawerElements {
  private TERMS_AND_CONDITIONS_CONTENT = '[data-testid="terms-and-conditions-content"]';

  get termsAndConditionsContent() {
    return $(this.TERMS_AND_CONDITIONS_CONTENT);
  }
}

export default new TermsAndConditionsSettingsDrawer();
