import recoveryPhrasePage from '../../elements/onboarding/recoveryPhrasePage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';
import { RecoveryPhrase } from '../../types/onboarding';

class OnboardingRecoveryPhrasePageAssert extends OnboardingCommonAssert {
  async assertEnterWalletButtonIsEnabled() {
    await this.assertNextButtonEnabled(true);
    await this.assertNextButtonTextEquals(await t('package.core.walletNameAndPasswordSetupStep.enterWallet'));
  }

  async assertSeeMnemonicVerificationPage(flowType: 'Create' | 'Restore', mnemonicWordsLength: RecoveryPhrase) {
    const subtitle =
      flowType === 'Create'
        ? await t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription')
        : `${await t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength')}\n12\n15\n24`;
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.enterPassphrase'));
    await this.assertSeeStepSubtitle(subtitle);
    await recoveryPhrasePage.pasteFromClipboardButton.waitForDisplayed();
    expect(await recoveryPhrasePage.pasteFromClipboardButton.getText()).to.equal(
      await t('core.walletSetupMnemonicStepRevamp.pasteFromClipboard')
    );
    await this.assertSeeMnemonicInputs(mnemonicWordsLength);
  }

  async assertSeeMnemonicWritedownPage(mnemonicWordsLength: RecoveryPhrase) {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.writePassphraseTitle'));
    await this.assertSeeStepSubtitle(
      `${await t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1')} ${await t(
        'core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'
      )}`
    );
    await recoveryPhrasePage.copyToClipboardButton.waitForDisplayed();
    expect(await recoveryPhrasePage.copyToClipboardButton.getText()).to.equal(
      await t('core.walletSetupMnemonicStepRevamp.copyToClipboard')
    );
    await this.assertSeeMnemonicWords(mnemonicWordsLength);
  }
  async assertSeeMnemonicError(shouldBeDisplayed: boolean) {
    await recoveryPhrasePage.errorMessage.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      const actualErrorText = await recoveryPhrasePage.errorMessage.getText();
      expect(actualErrorText).to.equal(await t('core.walletSetupMnemonicStep.passphraseError'));
    }
  }

  async assertSeeMnemonicWords(mnemonicWordsLength: RecoveryPhrase) {
    expect((await recoveryPhrasePage.mnemonicWords.length).toString()).to.equal(mnemonicWordsLength);
  }

  async assertSeeMnemonicInputs(mnemonicWordsLength: RecoveryPhrase) {
    expect((await recoveryPhrasePage.mnemonicInputs.length).toString()).to.equal(mnemonicWordsLength);
  }
}

export default new OnboardingRecoveryPhrasePageAssert();
