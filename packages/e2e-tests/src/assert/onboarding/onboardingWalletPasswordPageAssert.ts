import OnboardingWalletPasswordPage from '../../elements/onboarding/walletPasswordPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingWalletPasswordPageAssert extends OnboardingCommonAssert {
  async assertSeePasswordInput() {
    await OnboardingWalletPasswordPage.walletPasswordInput.waitForDisplayed();
  }

  async assertSeePasswordConfirmInput() {
    await OnboardingWalletPasswordPage.walletPasswordConfirmInput.waitForDisplayed();
  }

  async assertSeePasswordRecommendation(expectedMessage: string, shouldSee: boolean) {
    const passwordRecommendations = await OnboardingWalletPasswordPage.passwordFeedback.getText();
    shouldSee
      ? await expect(passwordRecommendations).to.contain(expectedMessage)
      : await expect(passwordRecommendations).to.not.contain(expectedMessage);
  }

  async assertSeePasswordConfirmationError(expectedMessage: string, shouldSee: boolean) {
    await OnboardingWalletPasswordPage.walletPasswordConfirmError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await OnboardingWalletPasswordPage.walletPasswordConfirmError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeComplexityBar(complexityBarLength: 0 | 1 | 2 | 3 | 4) {
    const numberOfBars = await OnboardingWalletPasswordPage.getNumberOfActiveComplexityBars();
    await expect(numberOfBars.toString()).to.equal(complexityBarLength);
  }

  async assertSeePasswordPage(flow: 'onboarding' | 'forgot_password') {
    await this.assertSeeStepTitle(await t('core.walletSetupRegisterStep.titlePassword'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupRegisterStep.passwordDescription'));
    await this.assertSeePasswordInput();
    await this.assertSeePasswordConfirmInput();

    if (flow === 'onboarding') {
      await this.assertSeeBackButton(); // LW-3323
    }
    await this.assertSeeNextButton();
    await this.assertNextButtonEnabled(false);

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingWalletPasswordPageAssert();
