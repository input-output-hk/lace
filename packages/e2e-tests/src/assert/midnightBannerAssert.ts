import { expect } from 'chai';
import { readFromFile } from '../utils/fileUtils';
import midnightBanner from '../elements/midnightBanner';

const data: Record<string, string> = JSON.parse(
  readFromFile(import.meta.dirname, '../../../translation/src/lib/translations/browser-extension-wallet/en.json')
);

class MidnightBannerAssert {
  async assertSeeMidnightBanner() {
    await midnightBanner.title.waitForDisplayed();
    expect(await midnightBanner.title.getText()).to.equal(data['midnightEventBanner.title']);
    await midnightBanner.closeButton.waitForDisplayed();
    await midnightBanner.learnMoreButton.waitForDisplayed();
    await midnightBanner.remindMeLaterButton.waitForDisplayed();
    await midnightBanner.bannerDescriptionText.waitForDisplayed();
    expect(await midnightBanner.bannerDescriptionText.getText()).to.equal(data['midnightEventBanner.description']);
  }
}

export default new MidnightBannerAssert();
