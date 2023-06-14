import OnboardingLegalPage from '../elements/onboarding/legalPage';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import OnboardingWalletNamePage from '../elements/onboarding/walletNamePage';
import OnboardingMnemonicPage from '../elements/onboarding/mnemonicPage';
import OnboardingWalletPasswordPage from '../elements/onboarding/walletPasswordPage';
import RecoveryPhraseLengthPage from '../elements/onboarding/recoveryPhraseLengthPage';
import { Logger } from '../support/logger';
import { browser } from '@wdio/globals';
import AnalyticsPage from '../elements/onboarding/analyticsPage';
import { clearInputFieldValue } from '../utils/inputFieldUtils';

class OnboardingPageObject {
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

  async clickHeaderToLooseFocus() {
    await OnboardingMnemonicPage.stepHeader.click();
  }

  async goToMnemonicWriteDownPage(length?: '12' | '15' | '24') {
    const validPassword = 'N_8J@bne87A';
    await this.openNameYourWalletPage();
    await this.fillWalletNameInput('ValidWalletName');
    await OnboardingWalletNamePage.nextButton.click();
    await this.fillPasswordInput(validPassword);
    await this.fillPasswordConfirmationInput(validPassword);
    await OnboardingWalletPasswordPage.nextButton.click();
    if (length) {
      await this.selectRecoveryPassphraseLength(length);
    }
    await RecoveryPhraseLengthPage.nextButton.click();
    await browser.pause(300);
  }

  async openMnemonicWriteDownPage(expectedWordsPage: number): Promise<string[]> {
    const mnemonicWords: string[] = [];
    mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));

    switch (Number(expectedWordsPage)) {
      case 16: {
        await OnboardingMnemonicPage.nextButton.click();
        mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
        break;
      }
      case 24: {
        await OnboardingMnemonicPage.nextButton.click();
        mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
        await OnboardingMnemonicPage.nextButton.click();
        mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
        break;
      }
      default: {
        break;
      }
    }
    Logger.log(`returning mnemonic: ${mnemonicWords.join(' ')}`);
    return mnemonicWords;
  }

  async openMnemonicVerificationPage(expectedWordsPage: number): Promise<string[]> {
    const mnemonicWords: string[] = [...(await this.openMnemonicWriteDownPage(24))];
    await OnboardingMnemonicPage.nextButton.click();

    switch (Number(expectedWordsPage)) {
      case 16: {
        await this.fillMnemonicFields(mnemonicWords, 0);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      }
      case 24: {
        await this.fillMnemonicFields(mnemonicWords, 0);
        await OnboardingMnemonicPage.nextButton.click();
        await this.fillMnemonicFields(mnemonicWords, 8);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      }
      default: {
        break;
      }
    }
    return mnemonicWords;
  }

  async openMnemonicVerificationLastPageFromWalletCreate() {
    const mnemonicWords: string[] = await this.openMnemonicVerificationPage(24);
    await this.fillMnemonicFields(mnemonicWords, 16);
  }

  async openMnemonicVerificationLastPage(mnemonicWords?: string[], length?: '12' | '15' | '24') {
    if (mnemonicWords) {
      await this.fillMnemonicFields(mnemonicWords, 0);
      await OnboardingMnemonicPage.nextButton.click();
      await this.fillMnemonicFields(mnemonicWords, 8);
      if (length === '24' || length === undefined) {
        await OnboardingMnemonicPage.nextButton.click();
        await this.fillMnemonicFields(mnemonicWords, 16);
      }
    } else {
      mnemonicWords = await this.openMnemonicVerificationPage(24);
      await this.fillMnemonicFields(mnemonicWords, 16);
    }
  }

  async openConnectHardwareWalletPage() {
    await this.openNameYourWalletPage();
  }

  async fillMnemonicFields(mnemonicWords: string[], offset: 0 | 8 | 16) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    for (const [i, input] of inputs.entries()) {
      await input.setValue(mnemonicWords[i + offset]);
    }
  }

  async fillMnemonicInput(value: string) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await clearInputFieldValue(inputs[0]);
    await inputs[0].setValue(value);
  }

  async clickOnInput() {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await inputs[0].click();
  }

  async addCharToMnemonicField(characters: string, inputNumber: number) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await inputs[inputNumber].addValue(characters);
  }

  async openAllDonePage() {
    await this.goToMnemonicWriteDownPage();
    await this.openMnemonicVerificationLastPageFromWalletCreate();
    await OnboardingMnemonicPage.nextButton.click();
  }

  async openAllDonePageFromWalletRestore(mnemonicWords: string[], length?: '12' | '15' | '24') {
    await this.goToMnemonicWriteDownPage();
    await this.openMnemonicVerificationLastPage(mnemonicWords, length);
    await OnboardingMnemonicPage.nextButton.click();
  }

  async acceptTCCheckbox() {
    await OnboardingLegalPage.termsCheckbox.scrollIntoView();
    await OnboardingLegalPage.termsCheckbox.click();
  }

  async fillWalletNameInput(text: string) {
    await OnboardingWalletNamePage.setWalletNameInput(text);
  }

  async fillPasswordInput(text: string) {
    await OnboardingWalletPasswordPage.walletPasswordInput.setValue(text);
  }

  async fillPasswordConfirmationInput(text: string) {
    await OnboardingWalletPasswordPage.walletPasswordConfirmInput.setValue(text);
  }

  async fillPasswordPage(password: string, passwordConfirmation: string) {
    await this.fillPasswordInput(password);
    await this.fillPasswordConfirmationInput(passwordConfirmation);
  }

  async hoverOverNextButton() {
    await OnboardingLegalPage.nextButton.moveTo();
  }

  async changeRandomMnemonicField() {
    const randomFieldNo = Math.floor(Math.random() * 8);
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await inputs[randomFieldNo].setValue('.');
  }

  async clickOnLegalLink(link: string) {
    switch (link) {
      case 'Cookie policy': {
        await OnboardingMainPage.cookiePolicyLink.click();
        break;
      }
      case 'Privacy policy': {
        await OnboardingMainPage.privacyPolicyLink.click();
        break;
      }
      case 'Terms of service': {
        await OnboardingMainPage.termsOfServiceLink.click();
        break;
      }
      default: {
        throw new Error(`Unsupported legal link - ${link}`);
      }
    }
  }

  async selectRecoveryPassphraseLength(length: '12' | '15' | '24') {
    switch (length) {
      case '12': {
        await RecoveryPhraseLengthPage.radioButton12wordsButton.click();
        break;
      }
      case '15': {
        await RecoveryPhraseLengthPage.radioButton15wordsButton.click();
        break;
      }
      case '24': {
        await RecoveryPhraseLengthPage.radioButton24wordsButton.click();
      }
    }
  }
}

export default new OnboardingPageObject();
