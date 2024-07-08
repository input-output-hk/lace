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

  async assertSeeEmptyPasswordConfirmationInput(shouldBeDisplayed: boolean) {
    await walletSetupPage.walletPasswordConfirmInput.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await walletSetupPage.walletPasswordConfirmInput.getValue()).to.equal('');
    }
  }

  async assertPasswordIsVisible(shouldBeVisible: boolean): Promise<void> {
    expect(await walletSetupPage.walletPasswordInput.getAttribute('type')).to.equal(
      shouldBeVisible ? 'text' : 'password'
    );
  }

  async assertConfirmPasswordIsVisible(shouldBeVisible: boolean): Promise<void> {
    expect(await walletSetupPage.walletPasswordConfirmInput.getAttribute('type')).to.equal(
      shouldBeVisible ? 'text' : 'password'
    );
  }

  async assertEnterWalletButtonIsEnabled() {
    await this.assertNextButtonEnabled(true);
  }

  async assertSeeEnterWalletButton() {
    await walletSetupPage.enterWalletButton.waitForDisplayed();
    await this.assertNextButtonTextEquals(await t('core.walletNameAndPasswordSetupStep.enterWallet'));
  }

  async assertSeePasswordRecommendation(expectedMessage: string, shouldSee: boolean) {
    if (shouldSee) {
      const passwordRecommendations = await walletSetupPage.passwordFeedback.getText();
      expect(passwordRecommendations).to.contain(expectedMessage);
    } else {
      await walletSetupPage.passwordFeedback.waitForDisplayed({ reverse: true });
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
    await this.assertSeeStepTitle(await t('core.walletNameAndPasswordSetupStep.title'));
    await this.assertSeeStepSubtitle(await t('core.walletNameAndPasswordSetupStep.description'));
    await this.assertSeeWalletNameInput();
    await this.assertSeePasswordInput();
    await this.assertSeeBackButton();
    await this.assertSeeEnterWalletButton();

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingWalletSetupPageAssert();
