import OnboardingLegalPage from '../elements/onboarding/legalPage';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import OnboardingMnemonicPage from '../elements/onboarding/mnemonicPage';
import OnboardingWalletSetupPage from '../elements/onboarding/walletSetupPage';
import { browser } from '@wdio/globals';
import AnalyticsPage from '../elements/onboarding/analyticsPage';
import { clearInputFieldValue } from '../utils/inputFieldUtils';

class OnboardingPageObject {
  public validPassword = 'N_8J@bne87A';

  async openLegalPage() {
    await this.acceptTCCheckbox();
  }

  async openAndAcceptTermsOfUsePage() {
    await this.openLegalPage();
    await OnboardingLegalPage.nextButton.click();
  }

  async openNameYourWalletPage() {
    await this.openAndAcceptTermsOfUsePage();
    await AnalyticsPage.nextButton.click();
  }

  async passMnemonicWriteDownPage(): Promise<string[]> {
    const mnemonicWords: string[] = [];
    mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
    await OnboardingMnemonicPage.nextButton.click();
    return mnemonicWords;
  }

  async passMnemonicVerificationPage(mnemonicWords: string[], expectedWordsPage: number): Promise<void> {
    switch (Number(expectedWordsPage)) {
      case 8:
        await this.fillMnemonicFields(mnemonicWords, 0);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      case 16:
        await this.fillMnemonicFields(mnemonicWords, 8);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      case 24:
        await this.fillMnemonicFields(mnemonicWords, 16);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      default:
        break;
    }
  }

  async fillMnemonicFields(mnemonicWords: string[], offset: 0 | 8 | 16) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    for (const [i, input] of inputs.entries()) {
      await clearInputFieldValue(input);
      await browser.keys(mnemonicWords[i + offset]);
    }
    await OnboardingMnemonicPage.stepTitle.click(); // Click outside input fields to trigger validation
  }

  async addCharToMnemonicField(characters: string, inputNumber: number) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await inputs[inputNumber].addValue(characters);
  }

  async acceptTCCheckbox() {
    await OnboardingLegalPage.termsCheckbox.scrollIntoView();
    await OnboardingLegalPage.termsCheckbox.click();
  }

  async fillWalletNameInput(text: string) {
    await OnboardingWalletSetupPage.setWalletNameInput(text);
  }

  async fillPasswordInput(text: string) {
    await OnboardingWalletSetupPage.walletPasswordInput.setValue(text);
  }

  async fillPasswordConfirmationInput(text: string) {
    await OnboardingWalletSetupPage.walletPasswordConfirmInput.setValue(text);
  }

  async fillPasswordPage(password: string, passwordConfirmation: string) {
    await this.fillPasswordInput(password);
    await this.fillPasswordConfirmationInput(passwordConfirmation);
  }

  async clickOnLegalLink(link: string) {
    switch (link) {
      case 'Cookie policy':
        await OnboardingMainPage.cookiePolicyLink.click();
        break;
      case 'Privacy policy':
        await OnboardingMainPage.privacyPolicyLink.click();
        break;
      case 'Terms of service':
        await OnboardingMainPage.termsOfServiceLink.click();
        break;
      default:
        throw new Error(`Unsupported legal link - ${link}`);
    }
  }
}

export default new OnboardingPageObject();
