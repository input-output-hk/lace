import { expect } from 'chai';
import midnightBanner from '../elements/midnightBanner';
import en from '../../../translation/src/lib/translations/browser-extension-wallet/en.json';

class MidnightBannerAssert {
  async assertSeeMidnightBanner() {
    await midnightBanner.title.waitForDisplayed();
    expect(await midnightBanner.title.getText()).to.equal(en['midnightEventBanner.title']);
    await midnightBanner.closeButton.waitForDisplayed();
    await midnightBanner.learnMoreButton.waitForDisplayed();
    await midnightBanner.remindMeLaterButton.waitForDisplayed();
    await midnightBanner.bannerDescriptionText.waitForDisplayed();
    expect(await midnightBanner.bannerDescriptionText.getText()).to.equal(en['midnightEventBanner.description']);
  }
}

export default new MidnightBannerAssert();
