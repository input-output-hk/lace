import WalletSetupPage from '../elements/onboarding/walletSetupPage';
import RecoveryPhrasePage from '../elements/onboarding/recoveryPhrasePage';
import onboardingRecoveryPhrasePageAssert from '../assert/onboarding/onboardingRecoveryPhrasePageAssert';
import { clearInputFieldValue } from '../utils/inputFieldUtils';
import mainPage from '../elements/onboarding/mainPage';

class OnboardingRevampPageObject {
  private mnemonicWords: string[] = [];

  getMnemonicWords(): string[] {
    return this.mnemonicWords;
  }

  async clickOnLegalLink(link: string, isMainPage = false): Promise<void> {
    switch (link) {
      case 'Cookie policy':
        await mainPage.cookiePolicyLink.click();
        break;
      case 'Privacy policy':
        isMainPage ? await mainPage.agreementPrivacyPolicyLink.click() : await mainPage.privacyPolicyLink.click();
        break;
      case 'Terms of service':
        isMainPage ? await mainPage.agreementTermsOfServiceLink.click() : await mainPage.termsOfServiceLink.click();
        break;
      default:
        throw new Error(`Unsupported legal link - ${link}`);
    }
  }

  async goToMenmonicVerificationPage(flowType: 'Create' | 'Restore', mnemonicWords: string[] = []): Promise<void> {
    await this.goToRecoveryPhrasePage();
    if (flowType === 'Create') {
      await this.collectMnemonicWords();
      await this.enterMnemonicWords();
    } else {
      await this.enterMnemonicWords(mnemonicWords);
    }
  }

  async goToRecoveryPhrasePage(): Promise<void> {
    await WalletSetupPage.setWalletNameInput('TestAutomationWallet');
    await WalletSetupPage.setWalletPasswordInput('N_8J@bne87A');
    await WalletSetupPage.setWalletPasswordConfirmInput('N_8J@bne87A');
    await WalletSetupPage.nextButton.click();
  }

  async collectMnemonicWords(): Promise<void> {
    this.mnemonicWords = await RecoveryPhrasePage.getMnemonicWordTexts();
    await WalletSetupPage.nextButton.click();
  }

  async clickEnterWalletButton(): Promise<void> {
    await onboardingRecoveryPhrasePageAssert.assertEnterWalletButtonIsEnabled();
    await WalletSetupPage.nextButton.click();
  }

  async enterMnemonicWord(value: string, inputNumber = 0, shouldTriggerValidation = true) {
    const inputs = await RecoveryPhrasePage.mnemonicInputs;
    await clearInputFieldValue(inputs[inputNumber]);
    await browser.keys(value);
    if (shouldTriggerValidation) {
      await RecoveryPhrasePage.stepTitle.click(); // Click outside input fields to trigger validation
    }
  }

  async enterMnemonicWords(mnemonicWords: string[] = []): Promise<void> {
    if (mnemonicWords.length > 0) {
      this.mnemonicWords = mnemonicWords;
    }
    const mnemonicInputs = await RecoveryPhrasePage.mnemonicInputs;
    for (let i = 0; i < this.mnemonicWords.length; i++) {
      await clearInputFieldValue(mnemonicInputs[i]);
      await mnemonicInputs[i].setValue(this.mnemonicWords[i]);
    }
  }
}

export default new OnboardingRevampPageObject();
