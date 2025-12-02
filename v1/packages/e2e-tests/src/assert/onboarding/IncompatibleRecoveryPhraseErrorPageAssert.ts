import OnboardingCommonAssert from './onboardingCommonAssert';
import IncompatibleRecoveryPhraseErrorPage from '../../elements/onboarding/IncompatibleRecoveryPhraseErrorPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class IncompatibleRecoveryPhraseErrorPageAssert extends OnboardingCommonAssert {
  async assertSeeIncompatibleRecoveryPhraseErrorPage() {
    await IncompatibleRecoveryPhraseErrorPage.sadFaceIcon.waitForDisplayed();
    await IncompatibleRecoveryPhraseErrorPage.errorMessage.waitForDisplayed();

    const errorText = await IncompatibleRecoveryPhraseErrorPage.errorMessage.getText();
    expect(errorText).to.include(await t('core.walletSetupReuseRecoveryPhrase.error'));
    expect(errorText).to.include(await t('core.walletSetupReuseRecoveryPhrase.createNewRecoveryPhrase'));
    expect(errorText).to.include(await t('core.walletSetupReuseRecoveryPhrase.supportedRecoveryPhrase'));

    await IncompatibleRecoveryPhraseErrorPage.backButton.waitForDisplayed();
    expect(await IncompatibleRecoveryPhraseErrorPage.backButton.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.selectAnotherWallet')
    );

    await IncompatibleRecoveryPhraseErrorPage.nextButton.waitForDisplayed();
    expect(await IncompatibleRecoveryPhraseErrorPage.nextButton.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.createNewOne')
    );
  }
}

export default new IncompatibleRecoveryPhraseErrorPageAssert();
