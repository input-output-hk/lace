import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import MnemonicInfoPage from '../../elements/onboarding/mnemonicInfoPage';

class OnboardingMnemonicInfoPageAssert extends OnboardingCommonAssert {
  async assertSeeMnemonicInfoPage() {
    await this.assertSeeStepTitle(await t('core.walletSetupMnemonicStepRevamp.writePassphraseTitle'));
    const expectedStepSubtitle = `${await t('core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle1')} ${await t(
      'core.walletSetupMnemonicStepRevamp.writePassphraseSubtitle2'
    )}`;
    await this.assertSeeStepSubtitle(expectedStepSubtitle);
    await this.assertSeeMnemonicInfoPageContentLink();
    await MnemonicInfoPage.mnemonicVideoFrame.waitForDisplayed();
    await this.assertSeeBackButton();
    await this.assertSeeNextButton();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
  }

  async assertSeeMnemonicInfoPageContentLink() {
    // await MnemonicInfoPage.hereLink.waitForDisplayed();
    // expect(await MnemonicInfoPage.hereLink.getText()).to.equal(await t('core.walletSetupMnemonicIntroStep.link'));
    // const expectedHref = 'https://www.lace.io/faq?question=what-is-my-secret-recovery-phrase';
    // const currentHref = await MnemonicInfoPage.hereLink.getAttribute('href');
    // expect(currentHref).to.equal(expectedHref);
  }
}

export default new OnboardingMnemonicInfoPageAssert();
