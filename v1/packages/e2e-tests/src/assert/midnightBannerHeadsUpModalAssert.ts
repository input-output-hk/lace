import { expect } from 'chai';
import { t } from '../utils/translationService';
import MidnightBannerHeadsUpModal from '../elements/midnightBannerHeadsUpModal';

class MidnightBannerHeadsUpModalAssert {
  async assertSeeHeadsUpModalTitle() {
    await MidnightBannerHeadsUpModal.headsUpModalTitle.waitForDisplayed();
    expect(await MidnightBannerHeadsUpModal.headsUpModalTitle.getText()).to.equal(
      await t('midnightLaunchBanner.dialog.title')
    );
  }

  async assertSeeHeadsUpModalDescription() {
    await MidnightBannerHeadsUpModal.headsUpModalDescription.waitForDisplayed();
    expect(await MidnightBannerHeadsUpModal.headsUpModalDescription.getText()).to.equal(
      await t('midnightLaunchBanner.dialog.description')
    );
  }

  async assertSeeHeadsUpModalButtons() {
    await MidnightBannerHeadsUpModal.headsUpModalCancelButton.waitForDisplayed();
    expect(await MidnightBannerHeadsUpModal.headsUpModalConfirmButton.getText()).to.equal(
      await t('midnightLaunchBanner.dialog.confirm')
    );
    await MidnightBannerHeadsUpModal.headsUpModalConfirmButton.waitForDisplayed();
    expect(await MidnightBannerHeadsUpModal.headsUpModalCancelButton.getText()).to.equal(
      await t('midnightLaunchBanner.dialog.cancel')
    );
  }
}

export default new MidnightBannerHeadsUpModalAssert();
