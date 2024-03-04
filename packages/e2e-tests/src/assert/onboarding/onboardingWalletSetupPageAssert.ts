import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import walletSetupPage from '../../elements/onboarding/walletSetupPage';

class OnboardingWalletSetupPageAssert extends OnboardingCommonAssert {
  async assertSeeWalletSetupPage() {
    await this.assertSeeStepTitle(await t('package.core.walletNameAndPasswordSetupStep.title'));
    await this.assertSeeStepSubtitle(await t('package.core.walletNameAndPasswordSetupStep.description'));
    expect(await (await walletSetupPage.walletNameInput).isDisplayed()).to.be.true;
    expect(await (await walletSetupPage.walletPasswordInput).isDisplayed()).to.be.true;
  }
}

export default new OnboardingWalletSetupPageAssert();
