import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingCommonAssert from './onboardingCommonAssert';
import MnemonicInfoPage from '../../elements/onboarding/mnemonicInfoPage';

class OnboardingMnemonicInfoPageAssert extends OnboardingCommonAssert {
  async assertSeeMnemonicInfoPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicIntroStep.title'));
    const expectedStepSubtitle = `${await t('core.walletSetupMnemonicIntroStep.description')} ${await t(
      'core.walletSetupMnemonicIntroStep.link'
    )}`;
    await this.assertSeeStepSubtitle(expectedStepSubtitle);
    await this.assertSeeMnemonicInfoPageContentLink();
    await MnemonicInfoPage.mnemonicImage.waitForDisplayed();
    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeeMnemonicInfoPageContentLink() {
    await MnemonicInfoPage.hereLink.waitForDisplayed();
    await expect(await MnemonicInfoPage.hereLink.getText()).to.equal(await t('core.walletSetupMnemonicIntroStep.link'));
    const expectedHref = 'https://www.lace.io/faq?question=what-is-my-secret-recovery-phrase';
    const currentHref = await MnemonicInfoPage.hereLink.getAttribute('href');
    await expect(currentHref).to.equal(expectedHref);
  }
}

export default new OnboardingMnemonicInfoPageAssert();
