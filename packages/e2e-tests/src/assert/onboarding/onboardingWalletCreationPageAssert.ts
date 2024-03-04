import { t } from '../../utils/translationService';
import WalletCreationPage from '../../elements/onboarding/WalletCreationPage';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingWalletCreationPageAssert extends OnboardingCommonAssert {
  async assertSeeCreatingWalletPage() {
    await WalletCreationPage.walletLoader.waitForDisplayed();
    await this.assertSeeStepTitle(await t('core.walletSetupCreateStep.title'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupCreateStep.description'));
  }

  async assertCreatingWalletDuration(duration: number) {
    await WalletCreationPage.walletLoader.waitForDisplayed({ timeout: 1000 * duration, reverse: true });
  }
}

export default new OnboardingWalletCreationPageAssert();
