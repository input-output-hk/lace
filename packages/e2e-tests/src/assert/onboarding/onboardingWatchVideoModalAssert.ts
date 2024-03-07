import { expect } from 'chai';
import { t } from '../../utils/translationService';
import OnboardingCommonAssert from './onboardingCommonAssert';
import WatchVideoModal from '../../elements/onboarding/watchVideoModal';

class OnboardingWatchVideoModalAssert extends OnboardingCommonAssert {
  async assertSeeModal() {
    expect(await (await WatchVideoModal.title).getText()).to.equal(await t('core.mnemonicVideoPopupContent.title'));
    const expectedDescription = `${await t('core.mnemonicVideoPopupContent.description')} ${await t(
      'core.mnemonicVideoPopupContent.link'
    )}`;
    expect(await (await WatchVideoModal.description).getText()).to.equal(expectedDescription);
    expect((await WatchVideoModal.video).isDisplayed).to.equal(true);
    expect((await WatchVideoModal.gotItButton).isDisplayed).to.equal(true);
    expect((await WatchVideoModal.readMoreLink).isDisplayed).to.equal(true);
  }
}

export default new OnboardingWatchVideoModalAssert();
