import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';
import OnboardingWalletNameAndPasswordPage from '../../elements/onboarding/walletNameAndPasswordPage';

class OnboardingWalletNameAndPasswordPageAssert extends OnboardingCommonAssert {
  async assertSeeWalletNameInput() {
    await OnboardingWalletNameAndPasswordPage.walletNameInput.waitForDisplayed();
  }

  async assertSeePasswordInput() {
    await OnboardingWalletNameAndPasswordPage.walletPasswordInput.waitForDisplayed();
  }

  async assertSeePasswordConfirmInput() {
    await OnboardingWalletNameAndPasswordPage.walletPasswordConfirmInput.waitForDisplayed();
  }

  async assertSeePasswordRecommendation(expectedMessage: string, shouldSee: boolean) {
    if (shouldSee) {
      const passwordRecommendations = await OnboardingWalletNameAndPasswordPage.passwordFeedback.getText();
      expect(passwordRecommendations).to.contain(expectedMessage);
    }
  }

  async assertSeePasswordConfirmationError(expectedMessage: string, shouldSee: boolean) {
    await OnboardingWalletNameAndPasswordPage.walletPasswordConfirmError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await OnboardingWalletNameAndPasswordPage.walletPasswordConfirmError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeComplexityBar(complexityBarLength: 0 | 1 | 2 | 3 | 4) {
    const numberOfBars = await OnboardingWalletNameAndPasswordPage.getNumberOfActiveComplexityBars();
    expect(numberOfBars.toString()).to.equal(complexityBarLength);
  }

  async assertSeeWalletNameError(expectedMessage: string, shouldBeDisplayed = true) {
    const nameError = await OnboardingWalletNameAndPasswordPage.walletNameError;
    await nameError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await nameError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeWalletNamePage() {
    await this.assertSeeWalletNameInput();
    await this.assertSeeStepTitle(await t('package.core.walletNameAndPasswordSetupStep.title'));
    await this.assertSeeStepSubtitle(await t('package.core.walletNameAndPasswordSetupStep.description'));

    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertNextButtonEnabled(false);

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeeNameAndPasswordPage(flow: 'onboarding' | 'forgot_password') {
    await this.assertSeeStepTitle(await t('package.core.walletNameAndPasswordSetupStep.title'));
    await this.assertSeeStepSubtitle(await t('package.core.walletNameAndPasswordSetupStep.description'));
    await this.assertSeePasswordInput();

    if (flow === 'onboarding') {
      await this.assertSeeBackButton(); // LW-3323
    }
    await this.assertSeeNextButton();
    await this.assertNextButtonEnabled(false);

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingWalletNameAndPasswordPageAssert();
