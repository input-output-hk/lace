import OnboardingLegalPage from '../elements/onboarding/legalPage';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import OnboardingMnemonicPage from '../elements/onboarding/mnemonicPage';
import OnboardingWalletNameAndPasswordPage from '../elements/onboarding/walletNameAndPasswordPage';
import RecoveryPhraseLengthPage from '../elements/onboarding/recoveryPhraseLengthPage';
import { Logger } from '../support/logger';
import { browser } from '@wdio/globals';
import AnalyticsPage from '../elements/onboarding/analyticsPage';
import Modal from '../elements/modal';
import CommonOnboardingElements from '../elements/onboarding/commonOnboardingElements';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import OnboardingAllDonePage from '../elements/onboarding/allDonePage';
import testContext from '../utils/testContext';
import { clearInputFieldValue } from '../utils/inputFieldUtils';
import WalletCreationPage from '../elements/onboarding/WalletCreationPage';
import OnboardingWalletSetupPageAssert from '../assert/onboarding/onboardingWalletSetupPageAssert';

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

  async clickHeaderToLooseFocus() {
    await OnboardingMnemonicPage.stepHeader.click();
  }

  async goToMnemonicWriteDownPage(length?: '12' | '15' | '24') {
    await this.openNameYourWalletPage();
    await this.fillWalletNameInput('ValidWalletName');
    await OnboardingWalletNameAndPasswordPage.nextButton.click();
    await this.fillPasswordInput(this.validPassword);
    await this.fillPasswordConfirmationInput(this.validPassword);
    await OnboardingWalletNameAndPasswordPage.nextButton.click();
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
      case 16:
        await OnboardingMnemonicPage.nextButton.click();
        mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
        break;
      case 24:
        await OnboardingMnemonicPage.nextButton.click();
        mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
        await OnboardingMnemonicPage.nextButton.click();
        mnemonicWords.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
        break;
      default:
        break;
    }
    Logger.log(`returning mnemonic: ${mnemonicWords.join(' ')}`);
    return mnemonicWords;
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

  async openMnemonicVerificationPage(expectedWordsPage: number): Promise<string[]> {
    const mnemonicWords: string[] = [...(await this.openMnemonicWriteDownPage(24))];
    await OnboardingMnemonicPage.nextButton.click();

    switch (Number(expectedWordsPage)) {
      case 16:
        await this.fillMnemonicFields(mnemonicWords, 0);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      case 24:
        await this.fillMnemonicFields(mnemonicWords, 0);
        await OnboardingMnemonicPage.nextButton.click();
        await this.fillMnemonicFields(mnemonicWords, 8);
        await OnboardingMnemonicPage.nextButton.click();
        break;
      default:
        break;
    }
    return mnemonicWords;
  }

  async openMnemonicVerificationLastPageFromWalletCreate() {
    const mnemonicWords: string[] = await this.openMnemonicVerificationPage(24);
    await this.fillMnemonicFields(mnemonicWords, 16);
  }

  async openMnemonicVerificationLastPage(mnemonicWords?: string[], length?: '12' | '15' | '24') {
    if (!mnemonicWords) {
      mnemonicWords = await this.openMnemonicVerificationPage(24);
      await this.fillMnemonicFields(mnemonicWords, 16);
    } else {
      await this.fillMnemonicFields(mnemonicWords, 0);
      await OnboardingMnemonicPage.nextButton.click();
      await this.fillMnemonicFields(mnemonicWords, 8);
      if (length === '24' || length === undefined) {
        await OnboardingMnemonicPage.nextButton.click();
        await this.fillMnemonicFields(mnemonicWords, 16);
      }
    }
  }

  async openConnectHardwareWalletPage() {
    await this.openNameYourWalletPage();
  }

  async fillMnemonicFields(mnemonicWords: string[], offset: 0 | 8 | 16) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    for (const [i, input] of inputs.entries()) {
      await clearInputFieldValue(input);
      await browser.keys(mnemonicWords[i + offset]);
    }
    await OnboardingMnemonicPage.stepTitle.click(); // Click outside input fields to trigger validation
  }

  async fillMnemonicInput(value: string, inputNumber = 0, shouldTriggerValidation = true) {
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await clearInputFieldValue(inputs[inputNumber]);
    await browser.keys(value);
    if (shouldTriggerValidation) {
      await OnboardingMnemonicPage.stepTitle.click(); // Click outside input fields to trigger validation
    }
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
    await OnboardingWalletNameAndPasswordPage.setWalletNameInput(text);
  }

  async fillPasswordInput(text: string) {
    await OnboardingWalletNameAndPasswordPage.walletPasswordInput.setValue(text);
  }

  async fillPasswordConfirmationInput(text: string) {
    await OnboardingWalletNameAndPasswordPage.walletPasswordConfirmInput.setValue(text);
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
    testContext.save('mnemonic', { index: randomFieldNo, value: await inputs[randomFieldNo].getValue() });
    await inputs[randomFieldNo].click();
    await browser.keys('.');
    await OnboardingMnemonicPage.stepTitle.click(); // Click outside input fields to trigger validation
  }

  async restorePreviousMnemonicWord() {
    const mnemonic = testContext.load('mnemonic') as { value: string; index: number };
    await this.fillMnemonicInput(mnemonic.value, mnemonic.index);
  }

  async clearRandomMnemonicField() {
    const randomFieldNo = Math.floor(Math.random() * 8);
    const inputs = await OnboardingMnemonicPage.mnemonicInputs;
    await clearInputFieldValue(inputs[randomFieldNo]);
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

  async selectRecoveryPassphraseLength(length: '12' | '15' | '24') {
    switch (length) {
      case '12':
        await RecoveryPhraseLengthPage.radioButton12wordsButton.click();
        break;
      case '15':
        await RecoveryPhraseLengthPage.radioButton15wordsButton.click();
        break;
      case '24':
        await RecoveryPhraseLengthPage.radioButton24wordsButton.click();
    }
  }

  async restoreWallet() {
    const commonOnboardingElements = new CommonOnboardingElements();

    await OnboardingMainPage.restoreWalletButton.click();
    await Modal.confirmButton.waitForClickable();
    await Modal.confirmButton.click();
    await this.openAndAcceptTermsOfUsePage();
    await AnalyticsPage.nextButton.click();
    await OnboardingWalletSetupPageAssert.assertSeeWalletSetupPage();
    await this.fillWalletNameInput('ValidName');
    await commonOnboardingElements.nextButton.click();
    await this.fillPasswordPage(this.validPassword, this.validPassword);
    await commonOnboardingElements.nextButton.click();
    await commonOnboardingElements.nextButton.click();
    await this.openMnemonicVerificationLastPage(getTestWallet(TestWalletName.TestAutomationWallet).mnemonic ?? []);
    await commonOnboardingElements.nextButton.click();
    await OnboardingAllDonePage.nextButton.click();
    await Modal.cancelButton.waitForClickable();
    await Modal.cancelButton.click();
  }

  async waitUntilLoaderDisappears() {
    await browser.pause(500);
    if (await WalletCreationPage.walletLoader.isDisplayed()) {
      await WalletCreationPage.walletLoader.waitForDisplayed({ timeout: 15_000, reverse: true });
    }
    if (await WalletCreationPage.mainLoaderText.isDisplayed()) {
      await WalletCreationPage.mainLoaderText.waitForDisplayed({ timeout: 255_000, reverse: true });
    }
  }
}

export default new OnboardingPageObject();
