import OnboardingWalletPasswordPage from '../../elements/onboarding/walletPasswordPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';
import OnboardingWalletNamePage from '../../elements/onboarding/walletNamePage';

class OnboardingWalletNameAndPasswordPageAssert extends OnboardingCommonAssert {
  async assertSeeWalletNameInput() {
    await OnboardingWalletNamePage.walletNameInput.waitForDisplayed();
  }

  async assertSeePasswordInput() {
    await OnboardingWalletPasswordPage.walletPasswordInput.waitForDisplayed();
  }

  async assertSeePasswordConfirmInput() {
    await OnboardingWalletPasswordPage.walletPasswordConfirmInput.waitForDisplayed();
  }

  async assertSeePasswordRecommendation(expectedMessage: string, shouldSee: boolean) {
    const passwordRecommendations = await OnboardingWalletPasswordPage.passwordFeedback.getText();
    shouldSee
      ? expect(passwordRecommendations).to.contain(expectedMessage)
      : expect(passwordRecommendations).to.not.contain(expectedMessage);
  }

  async assertSeePasswordConfirmationError(expectedMessage: string, shouldSee: boolean) {
    await OnboardingWalletPasswordPage.walletPasswordConfirmError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await OnboardingWalletPasswordPage.walletPasswordConfirmError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeComplexityBar(complexityBarLength: 0 | 1 | 2 | 3 | 4) {
    const numberOfBars = await OnboardingWalletPasswordPage.getNumberOfActiveComplexityBars();
    expect(numberOfBars.toString()).to.equal(complexityBarLength);
  }

  async assertSeeWalletNameError(expectedMessage: string, shouldBeDisplayed = true) {
    const nameError = await OnboardingWalletNamePage.walletNameError;
    await nameError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await nameError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeWalletNamePage() {
    await this.assertSeeWalletNameInput();
    await this.assertSeeStepTitle(await t('core.walletSetupRegisterStep.title'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupRegisterStep.description'));

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
