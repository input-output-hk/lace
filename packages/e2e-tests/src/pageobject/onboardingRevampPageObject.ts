import WalletSetupPage from '../elements/onboarding/walletSetupPage';
import RecoveryPhrasePage from '../elements/onboarding/recoveryPhrasePage';
import onboardingRecoveryPhrasePageAssert from '../assert/onboarding/onboardingRecoveryPhrasePageAssert';
import { shuffle } from '../utils/arrayUtils';

class OnboardingRevampPageObject {
  private mnemonicWords: string[] = [];

  getMnemonicWords(): string[] {
    return this.mnemonicWords;
  }

  async goToMenmonicVerificationPage(
    flowType: 'Create' | 'Restore',
    mnemonicWords: string[] = [],
    needsShuffle = false
  ): Promise<void> {
    await this.goToRecoveryPhrasePage();
    if (flowType === 'Create') {
      await this.collectMnemonicWords();
      if (needsShuffle) await this.shuffleMnemonicWords();
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

  async shuffleMnemonicWords(): Promise<void> {
    this.mnemonicWords = shuffle(this.mnemonicWords);
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
}

export default new OnboardingRevampPageObject();
