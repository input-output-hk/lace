import { expect } from 'chai';
import { t } from '../utils/translationService';
import midnightBanner from '../elements/midnightBanner';

class MidnightBannerAssert {
  async assertSeeMidnightBanner() {
    await midnightBanner.title.waitForDisplayed();
    expect(await midnightBanner.title.getText()).to.equal(await t('midnightEventBanner.title'));
    await midnightBanner.closeButton.waitForDisplayed();
    await midnightBanner.bannerDescriptionText.waitForDisplayed();
    expect(await midnightBanner.bannerDescriptionText.getText()).to.equal(await t('midnightEventBanner.description'));
    await midnightBanner.learnMoreButton.waitForDisplayed();
    expect(await midnightBanner.learnMoreButton.getText()).to.equal(await t('midnightEventBanner.learnMore'));
    await midnightBanner.remindMeLaterButton.waitForDisplayed();
    expect(await midnightBanner.remindMeLaterButton.getText()).to.equal(await t('midnightEventBanner.reminder'));
  }

  async assertSeeMidnightURL() {
    const MIDNIGHT_URL = 'https://www.midnight.gd';
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain(MIDNIGHT_URL);
  }
}

export default new MidnightBannerAssert();
