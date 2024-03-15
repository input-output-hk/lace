import WalletSetupPage from '../elements/onboarding/walletSetupPage';
import RecoveryPhrasePage from '../elements/onboarding/recoveryPhrasePage';
import onboardingRecoveryPhrasePageAssert from '../assert/onboarding/onboardingRecoveryPhrasePageAssert';

class OnboardingRevampPageObject {
  private mnemonicWords: string[] = [];

  getMnemonicWords(): string[] {
    return this.mnemonicWords;
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
    await this.enterWalletName('TestAutomationWallet');
    await this.enterWalletPassword('N_8J@bne87A');
    await this.enterWalletPasswordConfirm('N_8J@bne87A');
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

  async enterMnemonicWords(mnemonicWords: string[] = []): Promise<void> {
    if (mnemonicWords.length > 0) {
      this.mnemonicWords = mnemonicWords;
    }
    const mnemonicInputs = await RecoveryPhrasePage.mnemonicInputs;
    for (let i = 0; i < this.mnemonicWords.length; i++) {
      await mnemonicInputs[i].setValue(this.mnemonicWords[i]);
    }
  }

  async enterWalletName(walletName: string): Promise<void> {
    await WalletSetupPage.setWalletNameInput(walletName);
  }

  async enterWalletPassword(password: string): Promise<void> {
    await WalletSetupPage.walletPasswordInput.setValue(password);
  }

  async enterWalletPasswordConfirm(password: string): Promise<void> {
    await WalletSetupPage.walletPasswordConfirmInput.setValue(password);
  }
}

export default new OnboardingRevampPageObject();