import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import walletSetupPage from '../../elements/onboarding/walletSetupPage';

class OnboardingWalletSetupPageAssert extends OnboardingCommonAssert {
  async assertSeeWalletSetupPage() {
    await this.assertSeeStepTitle(await t('package.core.walletNameAndPasswordSetupStep.title'));
    await this.assertSeeStepSubtitle(await t('package.core.walletNameAndPasswordSetupStep.description'));
    await walletSetupPage.walletNameInput.waitForDisplayed();
    await walletSetupPage.walletPasswordInput.waitForDisplayed();
  }
}

export default new OnboardingWalletSetupPageAssert();
