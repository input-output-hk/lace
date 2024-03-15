import RecoveryPhraseLengthPage from '../../elements/onboarding/recoveryPhraseLengthPage';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingRecoveryPhraseLengthPageAssert extends OnboardingCommonAssert {
  async assertSeeRecoveryPhraseLengthPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.enterPassphrase'));
    await this.assertSeeStepSubtitle(
      `${await t('core.walletSetupMnemonicStepRevamp.enterPassphraseLength')}\n12\n15\n24`
    );

    await RecoveryPhraseLengthPage.radioButton12wordsButton.waitForExist();
    await RecoveryPhraseLengthPage.radioButton15wordsButton.waitForExist();
    await RecoveryPhraseLengthPage.radioButton24wordsButton.waitForExist();

    const wordPassphraseTranslation = await t('core.walletSetupRecoveryPhraseLengthStep.wordPassphrase');
    expect(await RecoveryPhraseLengthPage.radioButton12wordsButtonLabel.getText()).to.equal(
      `12-${wordPassphraseTranslation}`
    );
    expect(await RecoveryPhraseLengthPage.radioButton15wordsButtonLabel.getText()).to.equal(
      `15-${wordPassphraseTranslation}`
    );
    expect(await RecoveryPhraseLengthPage.radioButton24wordsButtonLabel.getText()).to.equal(
      `24-${wordPassphraseTranslation}`
    );

    expect(await RecoveryPhraseLengthPage.radioButton24wordsButton.isSelected()).to.be.true;

    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingRecoveryPhraseLengthPageAssert();
