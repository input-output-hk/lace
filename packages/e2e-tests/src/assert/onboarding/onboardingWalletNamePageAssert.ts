import OnboardingWalletNamePage from '../../elements/onboarding/walletNamePage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingWalletNamePageAssert extends OnboardingCommonAssert {
  async assertSeeWalletNameInput() {
    await OnboardingWalletNamePage.walletNameInput.waitForDisplayed();
  }

  async assertSeeWalletNameError(expectedMessage: string, shouldBeDisplayed = true) {
    const nameError = await OnboardingWalletNamePage.walletNameError;
    await nameError.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await nameError.getText()).to.equal(expectedMessage);
    }
  }

  async assertSeeWalletNamePage() {
    await this.assertSeeStepTitle(await t('core.walletSetupRegisterStep.title'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupRegisterStep.description'));
    await this.assertSeeWalletNameInput();

    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertNextButtonEnabled(false);

    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }
}

export default new OnboardingWalletNamePageAssert();
