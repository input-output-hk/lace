import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingRecoveryPhrasePageAssert extends OnboardingCommonAssert {
  async assertEnterWalletButtonIsEnabled() {
    await this.assertNextButtonEnabled(true);
    await this.assertNextButtonTextEquals(await t('core.walletSetupMnemonicStepRevamp.enterWallet'));
  }
  async seeMnemonicVerificationPage(flowType: 'Create' | 'Restore') {
    const subtitle =
      flowType === 'Create'
        ? await t('core.walletSetupMnemonicStepRevamp.enterPassphraseDescription')
        : `${await t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength')}\n12\n15\n24`;
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.enterPassphrase'));
    await this.assertSeeStepSubtitle(subtitle);
    // TODO: assertion for paste from clipboard
  }
}

export default new OnboardingRecoveryPhrasePageAssert();
