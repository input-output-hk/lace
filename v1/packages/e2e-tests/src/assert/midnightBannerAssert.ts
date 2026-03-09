import { expect } from 'chai';
import { t } from '../utils/translationService';
import MidnightBanner from '../elements/midnightBanner';

class MidnightBannerAssert {
  async assertSeeMidnightBanner(shouldBeDisplayed: boolean) {
    await MidnightBanner.title.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      expect(await MidnightBanner.title.getText()).to.equal(await t('midnightLaunchBanner.title'));
      await MidnightBanner.closeButton.waitForDisplayed();
      await MidnightBanner.bannerDescriptionText.waitForDisplayed();
      expect(await MidnightBanner.bannerDescriptionText.getText()).to.equal(
        await t('midnightLaunchBanner.description')
      );
      await MidnightBanner.midnightRegistrationButton.waitForDisplayed();
      expect(await MidnightBanner.midnightRegistrationButton.getText()).to.equal(
        await t('midnightLaunchBanner.ctaButton')
      );
    }
  }

  async assertSeeDustGenerationDApp() {
    const currentUrl = await browser.getUrl();
    expect(currentUrl).to.contain('https://midnight-dust-mainnet.nethermind.dev/');
  }
}

export default new MidnightBannerAssert();
