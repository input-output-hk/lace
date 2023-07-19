/* eslint-disable no-undef */
import OnboardingMnemonicPage from '../../elements/onboarding/mnemonicPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';
import { browser } from '@wdio/globals';

class OnboardingMnemonicPageAssert extends OnboardingCommonAssert {
  async assertSeeMnemonicWords(expectedNumber: number) {
    await expect(await OnboardingMnemonicPage.mnemonicWords.length).to.equal(expectedNumber);
  }

  async assertSeeMnemonicInputs(expectedNumber: number) {
    await expect(await OnboardingMnemonicPage.mnemonicInputs.length).to.equal(expectedNumber);
  }

  async assertSeeMnemonicInputWithDisabledAutocomplete() {
    const mnemonicInput = (await OnboardingMnemonicPage.mnemonicInputs[0]) as WebdriverIO.Element;
    expect(await mnemonicInput?.getAttribute('autocomplete')).to.equal('off');
  }

  async assertSeeMnemonicInputWithText(mnemonicIndex: number, expectedText: string) {
    const currentMnemonicInput = (await OnboardingMnemonicPage.mnemonicInputs[mnemonicIndex]) as WebdriverIO.Element;
    expect(await currentMnemonicInput?.getValue()).to.equal(expectedText);
  }

  async assertMnemonicInputLength(mnemonicIndex: number, expectedLength: number) {
    const currentMnemonicInput = (await OnboardingMnemonicPage.mnemonicInputs[mnemonicIndex]) as WebdriverIO.Element;
    const currentMnemonicInputLength = currentMnemonicInput ? (await currentMnemonicInput.getValue()).length : 0;
    expect(currentMnemonicInputLength).to.equal(expectedLength);
  }

  async assertSeeMnemonicAutocompleteOptions(expectedOptions: string[]) {
    await OnboardingMnemonicPage.mnemonicAutocompleteDropdown.waitForDisplayed();
    const actualOptions = await OnboardingMnemonicPage.getMnemonicAutocompleteOptionsValues();
    await expect(actualOptions).to.deep.equal(expectedOptions);
  }

  async assertNotSeeMnemonicAutocompleteOptions() {
    await OnboardingMnemonicPage.mnemonicAutocompleteDropdown.waitForDisplayed({ timeout: 1000 });
  }

  async assertSeeFooterValue(expectedFirstValue: number, expectedSecondValue = 24) {
    const expectedString = `${expectedFirstValue} / ${expectedSecondValue}`;
    await OnboardingMnemonicPage.stepInfoText.waitForDisplayed();
    await expect(await OnboardingMnemonicPage.stepInfoText.getText()).to.equal(expectedString);
  }

  async assertMnemonicWordsAreTheSame(
    mnemonicWords: string[],
    mnemonicWordsReference: string[],
    shouldBeEqual: boolean
  ) {
    await (shouldBeEqual
      ? expect(mnemonicWords).to.deep.equal(mnemonicWordsReference)
      : expect(mnemonicWords).to.not.deep.equal(mnemonicWordsReference));
  }

  async assertSeeFindOutMoreLink(): Promise<void> {
    await OnboardingMnemonicPage.findOutMoreLink.waitForDisplayed();
    await expect(await OnboardingMnemonicPage.findOutMoreLink.getText()).to.equal(
      await t('core.walletSetupMnemonicStep.passphraseInfo3')
    );
    const expectedHref = 'https://www.lace.io/faq?question=what-happens-if-i-lose-my-recovery-phrase';
    const actualHref = await OnboardingMnemonicPage.findOutMoreLink.getAttribute('href');
    expect(actualHref).to.equal(expectedHref);
  }

  async assertSeeMnemonicWriteDownPage(expectedFooterNumber: number) {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStep.writePassphrase'));
    const expectedSubtitle = `${await t('core.walletSetupMnemonicStep.passphraseInfo1')}\n${await t(
      'core.walletSetupMnemonicStep.passphraseInfo2'
    )} ${await t('core.walletSetupMnemonicStep.passphraseInfo3')}`;
    await this.assertSeeStepSubtitle(expectedSubtitle);
    await this.assertSeeFindOutMoreLink();
    await this.assertSeeMnemonicWords(8);
    await this.assertSeeFooterValue(expectedFooterNumber);
    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeeMnemonicVerificationWordsPage(expectedFooterFirstNumber: number, expectedFooterSecondNumber = 24) {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStep.enterPassphrase'));
    const url = await browser.getUrl();
    const expectedSubtitle = url.endsWith('/create')
      ? await t('core.walletSetupMnemonicStep.body') // create flow subtitle
      : await t('core.walletSetupMnemonicStep.enterPassphraseDescription'); // restore flow subtitle
    await this.assertSeeStepSubtitle(expectedSubtitle);
    await this.assertSeeFooterValue(expectedFooterFirstNumber, expectedFooterSecondNumber);
    // Check for LW-5757
    await this.assertSeeMnemonicInputWithDisabledAutocomplete();
    switch (expectedFooterSecondNumber) {
      case 12:
        Number(expectedFooterFirstNumber) === 8
          ? await this.assertSeeMnemonicInputs(8)
          : await this.assertSeeMnemonicInputs(4);
        break;
      case 15:
        Number(expectedFooterFirstNumber) === 8
          ? await this.assertSeeMnemonicInputs(8)
          : await this.assertSeeMnemonicInputs(7);
        break;
      case 24:
        await this.assertSeeMnemonicInputs(8);
        break;
    }

    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeeMnemonicError() {
    await OnboardingMnemonicPage.errorMessage.waitForDisplayed();
    const actualErrorText = await OnboardingMnemonicPage.errorMessage.getText();
    expect(actualErrorText).to.equal(await t('core.walletSetupMnemonicStep.passphraseError'));
  }
}

export default new OnboardingMnemonicPageAssert();
