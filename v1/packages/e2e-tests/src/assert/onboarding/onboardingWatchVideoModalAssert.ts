import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import WatchVideoModal from '../../elements/onboarding/watchVideoModal';

class OnboardingWatchVideoModalAssert extends OnboardingCommonAssert {
  async assertSeeModal() {
    await WatchVideoModal.title.waitForDisplayed();
    expect(await WatchVideoModal.title.getText()).to.equal(await t('core.mnemonicVideoPopupContent.title'));
    await WatchVideoModal.description.waitForDisplayed();
    expect(await WatchVideoModal.description.getText()).to.contain(
      await t('core.mnemonicVideoPopupContent.description')
    );
    await WatchVideoModal.video.waitForDisplayed();
    await WatchVideoModal.gotItButton.waitForDisplayed();
    expect(await WatchVideoModal.gotItButton.getText()).to.equal(await t('core.mnemonicVideoPopupContent.closeButton'));
    await WatchVideoModal.readMoreLink.waitForDisplayed();
    expect(await WatchVideoModal.readMoreLink.getText()).to.equal(await t('core.mnemonicVideoPopupContent.link'));
  }
}

export default new OnboardingWatchVideoModalAssert();
