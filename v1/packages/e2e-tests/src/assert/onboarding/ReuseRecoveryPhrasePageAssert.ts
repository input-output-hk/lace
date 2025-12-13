import OnboardingCommonAssert from './onboardingCommonAssert';
import ReuseRecoveryPhrasePage from '../../elements/onboarding/ReuseRecoveryPhrasePage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class ReuseRecoveryPhrasePageAssert extends OnboardingCommonAssert {
  async assertSeeReuseRecoveryPhrasePage() {
    await ReuseRecoveryPhrasePage.stepTitle.waitForDisplayed();
    expect(await ReuseRecoveryPhrasePage.stepTitle.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.title')
    );
    await ReuseRecoveryPhrasePage.stepSubtitle.waitForDisplayed();
    expect(await ReuseRecoveryPhrasePage.stepSubtitle.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.description')
    );
    await ReuseRecoveryPhrasePage.walletSelectInput.waitForDisplayed();

    await ReuseRecoveryPhrasePage.backButton.waitForDisplayed();
    expect(await ReuseRecoveryPhrasePage.backButton.getText()).to.equal(await t('core.walletSetupStep.back'));

    await ReuseRecoveryPhrasePage.nextButton.waitForDisplayed();
    expect(await ReuseRecoveryPhrasePage.nextButton.getText()).to.equal(
      await t('core.walletSetupReuseRecoveryPhrase.reuse')
    );
  }

  async assertWalletIsSelected(walletName: string) {
    await ReuseRecoveryPhrasePage.walletSelectInput.waitForDisplayed();
    const selectedValue = await ReuseRecoveryPhrasePage.walletSelectInput.getText();
    expect(selectedValue).to.include(walletName);
  }
}

export default new ReuseRecoveryPhrasePageAssert();
