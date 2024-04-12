import { StakePool } from '../data/expectedStakePoolsData';
import StakePoolDetails from '../elements/staking/stakePoolDetails';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import { TestnetPatterns } from '../support/patterns';
import { isPopupMode } from '../utils/pageUtils';

class StakePoolDetailsAssert {
  async assertSeeStakePoolDetailsPage(expectedStakedPool: StakePool, staked: boolean, noMetaDataPool = false) {
    (await isPopupMode())
      ? await StakePoolDetails.drawerHeaderBackButton.waitForClickable()
      : await StakePoolDetails.drawerHeaderCloseButton.waitForClickable();

    await this.assertSeeStakePoolDetailsCommonElements();

    expect(await StakePoolDetails.poolName.getText()).to.equal(expectedStakedPool.name);

    if (noMetaDataPool) {
      expect(await StakePoolDetails.poolTicker.getText()).to.contain(expectedStakedPool.poolId.slice(0, 6));
    } else {
      expect(await StakePoolDetails.poolTicker.getText()).to.equal(expectedStakedPool.ticker);

      expect(await StakePoolDetails.informationDescription.getText()).to.equal(expectedStakedPool.information);
      expect(await StakePoolDetails.socialLinksTitle.getText()).to.equal(
        await t('browserView.staking.details.social.title')
      );
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed();
    }

    if (staked) {
      await StakePoolDetails.banner.container.waitForDisplayed();
      await StakePoolDetails.banner.icon.waitForDisplayed();
      expect(await StakePoolDetails.banner.description.getText()).contains(
        await t('browserView.staking.details.unstakingIsNotYetAvailableFollowTheseStepsIfYouWishToChangeStakePool')
      );
    } else {
      await StakePoolDetails.stakeButton.waitForDisplayed();
      expect(await StakePoolDetails.stakeButton.getText()).to.equal(
        await t('browserView.staking.details.stakeButtonText')
      );
    }

    expect(await StakePoolDetails.informationTitle.getText()).to.equal(
      await t('browserView.staking.details.information.title')
    );
    expect(await StakePoolDetails.poolIdsTitle.getText()).to.equal(
      await t('browserView.staking.details.poolIds.title')
    );
    expect(await StakePoolDetails.poolId.getText()).to.equal(expectedStakedPool.poolId);

    expect(await StakePoolDetails.ownersTitle.getText()).to.equal(
      `${await t('browserView.staking.details.owners.title')} (1)`
    );

    for (const owner of await StakePoolDetails.owners) {
      const slicedString = (await owner.getText()).slice(0, 21);
      expect(expectedStakedPool.owners.some((x) => x.includes(slicedString))).to.be.true;
    }
  }

  async assertSeeStakePoolDetailsCommonElements() {
    await StakePoolDetails.poolName.waitForClickable();
    await StakePoolDetails.poolLogo.waitForDisplayed();

    expect(await StakePoolDetails.statisticsTitle.getText()).to.equal(
      await t('browserView.staking.details.statistics.title')
    );
    expect(await StakePoolDetails.activeStakeTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.activeStake')
    );
    expect(await StakePoolDetails.rosTitle.getText()).to.equal('ROS');
    // TODO BUG LW-5635
    // expect((await StakePoolDetails.rosValue.getText()) as string).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);

    expect((await StakePoolDetails.activeStakeValue.getText()).slice(0, -1)).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
    expect(await StakePoolDetails.saturationTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.saturation')
    );
    expect(await StakePoolDetails.saturationValue.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    expect(await StakePoolDetails.delegatorsTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.delegators')
    );
    expect(await StakePoolDetails.delegatorsValue.getText()).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  }
}

export default new StakePoolDetailsAssert();
