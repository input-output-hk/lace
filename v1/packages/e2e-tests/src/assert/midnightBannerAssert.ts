import { expect } from 'chai';
import { t } from '../utils/translationService';
import midnightBanner from '../elements/midnightBanner';

class MidnightBannerAssert {
  async assertSeeMidnightBanner(shouldBeDisplayed: boolean) {
    await midnightBanner.title.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await midnightBanner.title.getText()).to.equal(await t('midnightEventBanner.title'));
      await midnightBanner.closeButton.waitForDisplayed();
      await midnightBanner.bannerDescriptionText.waitForDisplayed();
      expect(await midnightBanner.bannerDescriptionText.getText()).to.equal(await t('midnightEventBanner.description'));
      await midnightBanner.learnMoreButton.waitForDisplayed();
      expect(await midnightBanner.learnMoreButton.getText()).to.equal(await t('midnightEventBanner.learnMore'));
      await midnightBanner.remindMeLaterButton.waitForDisplayed();
      expect(await midnightBanner.remindMeLaterButton.getText()).to.equal(await t('midnightEventBanner.reminder'));
    }
  }

  async assertSeeMidnightURL() {
    const currentUrl = await browser.getUrl();
    // the exact URL might change because of redirection, so just check that it contains 'midnight'
    expect(currentUrl).to.contain('midnight');
  }
}

export default new MidnightBannerAssert();
