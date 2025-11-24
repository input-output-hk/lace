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

  async assertSeeHeadsUpModalDescription() {
    await midnightBannerHeadsUpModal.headsUpModalDescription.waitForDisplayed();
    expect(await midnightBannerHeadsUpModal.headsUpModalDescription.getText()).to.equal(
      await t('midnightEventBanner.dialog.description')
    );
  }

  async assertSeeHeadsUpModalButtons() {
    await midnightBannerHeadsUpModal.headsUpModalCancelButton.waitForDisplayed();
    await midnightBannerHeadsUpModal.headsUpModalConfirmButton.waitForDisplayed();
  }
}

export default new MidnightBannerHeadsUpModalAssert();
