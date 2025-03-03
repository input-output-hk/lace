import OnboardingMainPage from '../../elements/onboarding/mainPage';
import OnboardingCommonAssert from '../onboarding/onboardingCommonAssert';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import OnboardingAnalyticsBannerAssert from './onboardingAnalyticsBannerAssert';

class OnboardingMainPageAssert extends OnboardingCommonAssert {
  async assertSeeLogo() {
    await OnboardingMainPage.logo.waitForDisplayed();
  }

  async assertSeeAgreementText() {
    await OnboardingMainPage.agreementText.waitForDisplayed();
    const expectedText = (await t('core.walletSetupOptionsStep.agreementText'))
      .replace('<a1>', '')
      .replace('</a1>', '')
      .replace('<a2>', '')
      .replace('</a2>', '');
    // assertion below covers whole text including "Terms of Service" and "Privacy Policy"
    expect(await OnboardingMainPage.agreementText.getText()).to.equal(expectedText);
  }

  async assertSeeTermsOfServiceLink() {
    await OnboardingMainPage.agreementTermsOfServiceLink.waitForDisplayed();
  }

  async assertSeePrivacyPolicyLink() {
    await OnboardingMainPage.agreementPrivacyPolicyLink.waitForDisplayed();
  }

  async assertSeeTitle() {
    await OnboardingMainPage.title.waitForDisplayed();
    expect(await OnboardingMainPage.title.getText()).to.equal(await t('core.walletSetupOptionsStep.title'));
  }

  async assertSeeSubtitle() {
    await OnboardingMainPage.subtitle.waitForDisplayed();
    expect(await OnboardingMainPage.subtitle.getText()).to.equal(await t('core.walletSetupOptionsStep.subTitle'));
  }

  async assertSeeCreateWalletOption() {
    await OnboardingMainPage.createWalletIcon.waitForDisplayed();
    await OnboardingMainPage.createWalletTitle.waitForDisplayed();
    expect(await OnboardingMainPage.createWalletTitle.getText()).to.equal(
      await t('core.walletSetupOptionsStep.newWallet.title')
    );
    await OnboardingMainPage.createWalletDescription.waitForDisplayed();
    expect(await OnboardingMainPage.createWalletDescription.getText()).to.equal(
      await t('core.walletSetupOptionsStep.newWallet.description')
    );
    await OnboardingMainPage.createWalletButton.waitForDisplayed();
    expect(await OnboardingMainPage.createWalletButton.getText()).to.equal(
      await t('core.walletSetupOptionsStep.newWallet.button')
    );
    await OnboardingMainPage.createWalletButton.waitForClickable();
  }

  async assertSeeHardwareWalletOption() {
    await OnboardingMainPage.hardwareWalletIcon.waitForDisplayed();
    await OnboardingMainPage.hardwareWalletTitle.waitForDisplayed();
    expect(await OnboardingMainPage.hardwareWalletTitle.getText()).to.equal(
      await t('core.walletSetupOptionsStep.hardwareWallet.title')
    );
    await OnboardingMainPage.hardwareWalletDescription.waitForDisplayed();
    expect(await OnboardingMainPage.hardwareWalletDescription.getText()).to.equal(
      await t('core.walletSetupOptionsStep.hardwareWallet.description')
    );
    await OnboardingMainPage.hardwareWalletButton.waitForDisplayed();
    expect(await OnboardingMainPage.hardwareWalletButton.getText()).to.equal(
      await t('core.walletSetupOptionsStep.hardwareWallet.button')
    );
    await OnboardingMainPage.hardwareWalletButton.waitForClickable();
  }

  async assertSeeRestoreWalletOption() {
    await OnboardingMainPage.restoreWalletIcon.waitForDisplayed();
    await OnboardingMainPage.restoreWalletTitle.waitForDisplayed();
    expect(await OnboardingMainPage.restoreWalletTitle.getText()).to.equal(
      await t('core.walletSetupOptionsStep.restoreWallet.title')
    );
    await OnboardingMainPage.restoreWalletDescription.waitForDisplayed();
    expect(await OnboardingMainPage.restoreWalletDescription.getText()).to.equal(
      await t('core.walletSetupOptionsStep.restoreWallet.description')
    );
    await OnboardingMainPage.restoreWalletButton.waitForDisplayed();
    expect(await OnboardingMainPage.restoreWalletButton.getText()).to.equal(
      await t('core.walletSetupOptionsStep.restoreWallet.button')
    );
    await OnboardingMainPage.restoreWalletButton.waitForClickable();
  }

  async assertSeeMainPage() {
    await OnboardingAnalyticsBannerAssert.assertBannerIsVisible(false);
    await this.assertSeeLogo();
    await this.assertSeeTitle();
    await this.assertSeeSubtitle();
    await this.assertSeeCreateWalletOption();
    await this.assertSeeHardwareWalletOption();
    await this.assertSeeRestoreWalletOption();
    await this.assertSeeLegalLinks();
    await this.assertSeeHelpAndSupportButton();
    await this.assertSeeAgreementText();
    await this.assertSeeTermsOfServiceLink();
    await this.assertSeePrivacyPolicyLink();
  }
}

export default new OnboardingMainPageAssert();
