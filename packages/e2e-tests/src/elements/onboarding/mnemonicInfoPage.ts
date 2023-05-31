import CommonOnboardingElements from './commonOnboardingElements';

class MnemonicInfoPage extends CommonOnboardingElements {
  private HERE_LINK = '[data-testid="faq-secret-passphrase-url"]';
  private MNEMONIC_IMAGE = '[data-testid="mnemonic-intro-image"]';

  get hereLink() {
    return $(this.HERE_LINK);
  }

  get mnemonicImage() {
    return $(this.MNEMONIC_IMAGE);
  }
}

export default new MnemonicInfoPage();
