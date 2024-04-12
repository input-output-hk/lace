import AnalyticsBanner from '../../elements/analyticsBanner';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class OnboardingAnalyticsBannerAssert {
  async assertBannerIsVisible(visible: boolean) {
    await AnalyticsBanner.container.waitForDisplayed({ reverse: !visible });
  }

  async assertBannerIsDisplayedCorrectly() {
    await AnalyticsBanner.container.waitForDisplayed();
    await AnalyticsBanner.agreeButton.waitForDisplayed();
    expect(await AnalyticsBanner.agreeButton.getText()).to.equal(await t('core.confirmationBanner.agree', 'core'));
    await AnalyticsBanner.rejectButton.waitForDisplayed();
    expect(await AnalyticsBanner.rejectButton.getText()).to.equal(await t('core.confirmationBanner.reject', 'core'));
    await AnalyticsBanner.message.waitForDisplayed();
    expect(await AnalyticsBanner.message.getText()).to.equal(await t('analyticsConfirmationBanner.message'));
    await AnalyticsBanner.learnMore.waitForDisplayed();
    expect(await AnalyticsBanner.learnMore.getText()).to.equal(await t('analyticsConfirmationBanner.learnMore'));
  }
}

export default new OnboardingAnalyticsBannerAssert();
