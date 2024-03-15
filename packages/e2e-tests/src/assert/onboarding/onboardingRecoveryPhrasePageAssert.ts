import recoveryPhrasePage from '../../elements/onboarding/recoveryPhrasePage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingRecoveryPhrasePageAssert extends OnboardingCommonAssert {
  async assertEnterWalletButtonIsEnabled() {
    await this.assertNextButtonEnabled(true);
    await this.assertNextButtonTextEquals(await t('core.walletSetupMnemonicStepRevamp.enterWallet'));
  }

  async assertSeeMnemonicVerificationPage(flowType: 'Create' | 'Restore') {
    const subtitle =
      flowType === 'Create'
        ? await t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription')
        : `${await t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength')}\n12\n15\n24`;
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.enterPassphrase'));
    await this.assertSeeStepSubtitle(subtitle);
    // TODO: assertion for paste from clipboard
  }

  async assertSeeMnemonicWritedownPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.writePassphraseTitle'));
    await this.assertSeeStepSubtitle(
      `${await t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1')} ${await t(
        'core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'
      )}`
    );
  }

  async assertSeeMnemonicWords() {
    expect(await recoveryPhrasePage.mnemonicWords.length).to.equal(24);
  }
}

export default new OnboardingRecoveryPhrasePageAssert();
