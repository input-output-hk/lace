import CommonOnboardingElements from '../../elements/onboarding/commonOnboardingElements';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { browser } from '@wdio/globals';

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

  async assertSeeNextButton(): Promise<void> {
    const nextButton = this.commonOnboardingElements.nextButton;
    await nextButton.waitForDisplayed();
    expect(await nextButton.getText()).to.equal(await t('walletSetup.layout.btns.next'));
  }

  async assertNextButtonEnabled(shouldBeEnabled: boolean): Promise<void> {
    await this.commonOnboardingElements.nextButton.waitForEnabled({ reverse: !shouldBeEnabled });
  }

  async assertNextButtonTextEquals(expectedText: string): Promise<void> {
    await this.commonOnboardingElements.nextButton.waitForDisplayed();
    expect(await this.commonOnboardingElements.nextButton.getText()).to.equal(expectedText);
  }

  async assertLegalContentIsDisplayed(linkName: string): Promise<void> {
    let expectedUrl;
    switch (linkName) {
      case 'Cookie policy':
        expectedUrl = 'https://www.lace.io/lace-cookie-policy.pdf';
        break;
      case 'Privacy policy':
        expectedUrl = 'https://www.lace.io/iog-privacy-policy.pdf';
        break;
      case 'Terms of service':
        expectedUrl = 'https://www.lace.io/lace-terms-of-use.pdf';
        break;
      default:
        throw new Error(`Unsupported legal link - ${linkName}`);
    }
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(expectedUrl);
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
}

export default OnboardingCommonAssert;
