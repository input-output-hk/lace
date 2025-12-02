import DelegateYourVotingPowerBanner from '../../elements/multidelegation/DelegateYourVotingPowerBanner';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class DelegateYourVotingPowerBannerAssert {
  assertSeeDelegateYourVotingPowerBanner = async (shouldBeDisplayed: boolean) => {
    await DelegateYourVotingPowerBanner.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
    if (shouldBeDisplayed) {
      await DelegateYourVotingPowerBanner.title.waitForDisplayed();
      expect(await DelegateYourVotingPowerBanner.title.getText()).to.equal(
        await t('browserView.staking.stakingInfo.RegisterAsDRepBanner.title')
      );
      await DelegateYourVotingPowerBanner.description.waitForDisplayed();
      const expectedDescription = (await t('browserView.staking.stakingInfo.RegisterAsDRepBanner.description'))
        .replace('<a>', '')
        .replace('</a>', '');
      expect(await DelegateYourVotingPowerBanner.description.getText()).to.equal(expectedDescription);
      await DelegateYourVotingPowerBanner.knowMoreLink.waitForDisplayed();
      await DelegateYourVotingPowerBanner.registerNowButton.waitForEnabled();
      expect(await DelegateYourVotingPowerBanner.registerNowButton.getText()).to.equal(
        await t('browserView.staking.stakingInfo.RegisterAsDRepBanner.cta')
      );
    }
  };
}

export default new DelegateYourVotingPowerBannerAssert();
