import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import walletSetupPage from '../../elements/onboarding/walletSetupPage';

class OnboardingWalletSetupPageAssert extends OnboardingCommonAssert {
  async assertSeeWalletNameInput() {
    await walletSetupPage.walletNameInput.waitForDisplayed();
  }

  async assertSeePasswordInput() {
    await walletSetupPage.walletPasswordInput.waitForDisplayed();
  }

  async assertSeePasswordConfirmInput() {
    await walletSetupPage.walletPasswordConfirmInput.waitForDisplayed();
  }

  async assertSeePasswordRecommendation(expectedMessage: string, shouldSee: boolean) {
    if (shouldSee) {
      const passwordRecommendations = await walletSetupPage.passwordFeedback.getText();
      expect(passwordRecommendations).to.contain(expectedMessage);
    }
  }

  async assertSeePasswordConfirmationError(expectedMessage: string, shouldSee: boolean) {
    await walletSetupPage.walletPasswordConfirmError.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await walletSetupPage.walletPasswordConfirmError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeComplexityBar(complexityBarLength: 0 | 1 | 2 | 3 | 4) {
    const numberOfBars = await walletSetupPage.getNumberOfActiveComplexityBars();
    expect(numberOfBars.toString()).to.equal(complexityBarLength);
  }

  async assertSeeWalletNameError(expectedMessage: string, shouldBeDisplayed = true) {
    const nameError = await walletSetupPage.walletNameError;
    await nameError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await nameError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeWalletSetupPage() {
    await this.assertSeeStepTitle(await t('package.core.walletNameAndPasswordSetupStep.title'));
    await this.assertSeeStepSubtitle(await t('package.core.walletNameAndPasswordSetupStep.description'));
    await this.assertSeeWalletNameInput();
    await this.assertSeePasswordInput();
    await this.assertSeeBackButton();
    await this.assertSeeNextButton();

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingWalletSetupPageAssert();
