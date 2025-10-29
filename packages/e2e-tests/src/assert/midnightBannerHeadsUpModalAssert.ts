import { expect } from 'chai';
import { t } from '../utils/translationService';
import midnightBannerHeadsUpModal from '../elements/midnightBannerHeadsUpModal';

class MidnightBannerHeadsUpModalAssert {
  async assertSeeHeadsUpModalTitle() {
    await midnightBannerHeadsUpModal.headsUpModalTitle.waitForDisplayed();
    expect(await midnightBannerHeadsUpModal.headsUpModalTitle.getText()).to.equal(
      await t('midnightEventBanner.dialog.title')
    );
  }
}

export default new MidnightBannerHeadsUpModalAssert();
