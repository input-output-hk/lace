import { t } from '../../utils/translationService';
import WalletCreationPage from '../../elements/onboarding/WalletCreationPage';
import OnboardingCommonAssert from './onboardingCommonAssert';

class OnboardingWalletCreationPageAssert extends OnboardingCommonAssert {
  async assertSeeCreatingWalletPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupCreateStep.title'));
    await this.assertSeeStepSubtitle(await t('core.walletSetupCreateStep.description'));
    await WalletCreationPage.walletLoader.waitForDisplayed();
  }

  async assertCreatingWalletDuration(duration: number) {
    await WalletCreationPage.walletLoader.waitForDisplayed();
    await WalletCreationPage.walletLoader.waitForDisplayed({ timeout: 1000 * duration, reverse: true });
  }
}

export default new OnboardingWalletCreationPageAssert();
