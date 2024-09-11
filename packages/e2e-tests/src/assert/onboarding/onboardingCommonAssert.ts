import CommonOnboardingElements from '../../elements/onboarding/commonOnboardingElements';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import type { TimelineStep } from '../../types/onboarding';

class OnboardingCommonAssert {
  private commonOnboardingElements: CommonOnboardingElements;

  constructor() {
    this.commonOnboardingElements = new CommonOnboardingElements();
  }

  async assertSeeStepTitle(expectedTitle: string): Promise<void> {
    await this.commonOnboardingElements.stepTitle.waitForStable();
    expect(await this.commonOnboardingElements.stepTitle.getText()).to.equal(expectedTitle);
  }

  async assertSeeStepSubtitle(expectedSubtitle: string): Promise<void> {
    await this.commonOnboardingElements.stepSubtitle.waitForDisplayed();
    expect(await this.commonOnboardingElements.stepSubtitle.getText()).to.equal(expectedSubtitle);
  }

  async assertSeeBackButton(): Promise<void> {
    const backButton = this.commonOnboardingElements.backButton;
    await backButton.waitForDisplayed();
    expect(await backButton.getText()).to.equal(await t('walletSetup.layout.btns.back'));
  }

  async assertNextButtonEnabled(shouldBeEnabled: boolean): Promise<void> {
    await this.commonOnboardingElements.nextButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertNextButtonTextEquals(expectedText: string): Promise<void> {
    await this.commonOnboardingElements.nextButton.waitForDisplayed();
    expect(await this.commonOnboardingElements.nextButton.getText()).to.equal(expectedText);
  }

  async assertSeeLegalLinks(): Promise<void> {
    await this.commonOnboardingElements.cookiePolicyLink.waitForDisplayed();
    expect(await this.commonOnboardingElements.cookiePolicyLink.getText()).to.equal(
      await t('settings.legals.cookiePolicy')
    );
    await this.commonOnboardingElements.privacyPolicyLink.waitForDisplayed();
    expect(await this.commonOnboardingElements.privacyPolicyLink.getText()).to.equal(
      await t('settings.legals.privacyPolicy')
    );
    await this.commonOnboardingElements.termsOfServiceLink.waitForDisplayed();
    expect(await this.commonOnboardingElements.termsOfServiceLink.getText()).to.equal(
      await t('settings.legals.termsOfService')
    );
  }

  async assertSeeHelpAndSupportButton(): Promise<void> {
    await this.commonOnboardingElements.helpAndSupportButton.waitForDisplayed();
    expect(await this.commonOnboardingElements.helpAndSupportButton.getText()).to.equal(
      await t('general.lock.helpAndSupport')
    );
  }

  async assertSeeActiveStepOnProgressTimeline(step: TimelineStep): Promise<void> {
    await this.commonOnboardingElements.activeStepIndicator.waitForDisplayed();
    let expectedStepTitle;
    switch (step) {
      case 'Wallet setup':
        expectedStepTitle = await t('core.walletSetupStep.walletSetup');
        break;
      case 'Enter wallet':
        expectedStepTitle = await t('core.walletSetupStep.enterWallet');
        break;
      case 'Connect device':
        expectedStepTitle = await t('core.walletSetupStep.connectWallet');
        break;
      case 'Recovery method':
        expectedStepTitle = await t('core.walletSetup.recoveryMethod');
        break;
      case 'Recovery setup':
        expectedStepTitle = await t('core.walletSetup.recoveryDetails');
        break;
      default:
        throw new Error(`Unsupported step: ${step}`);
    }
    expect(await this.commonOnboardingElements.activeStepIndicator.getText()).to.equal(expectedStepTitle);
  }
}

export default OnboardingCommonAssert;
