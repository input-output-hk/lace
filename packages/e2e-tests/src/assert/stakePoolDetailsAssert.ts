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

    await expect(await StakePoolDetails.poolName.getText()).to.equal(expectedStakedPool.name);

    if (noMetaDataPool) {
      await expect(await StakePoolDetails.poolTicker.getText()).to.contain(expectedStakedPool.poolId.slice(0, 6));
    } else {
      await expect(await StakePoolDetails.poolTicker.getText()).to.equal(expectedStakedPool.ticker);

      await expect(await StakePoolDetails.informationDescription.getText()).to.equal(expectedStakedPool.information);
      await expect(await StakePoolDetails.socialLinksTitle.getText()).to.equal(
        await t('browserView.staking.details.social.title')
      );
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed();
    }

    if (staked === true) {
      await StakePoolDetails.banner.container.waitForDisplayed();
      await StakePoolDetails.banner.icon.waitForDisplayed();
      await expect(await StakePoolDetails.banner.description.getText()).contains(
        await t('browserView.staking.details.unstakingIsNotYetAvailableFollowTheseStepsIfYouWishToChangeStakePool')
      );
    } else {
      await StakePoolDetails.stakeButton.waitForDisplayed();
      await expect(await StakePoolDetails.stakeButton.getText()).to.equal(
        await t('browserView.staking.details.stakeButtonText')
      );
    }

    await expect(await StakePoolDetails.informationTitle.getText()).to.equal(
      await t('browserView.staking.details.information.title')
    );
    await expect(await StakePoolDetails.poolIdsTitle.getText()).to.equal(
      await t('browserView.staking.details.poolIds.title')
    );
    await expect(await StakePoolDetails.poolId.getText()).to.equal(expectedStakedPool.poolId);

    await expect(await StakePoolDetails.ownersTitle.getText()).to.equal(
      `${await t('browserView.staking.details.owners.title')} (1)`
    );

    for (const owner of await StakePoolDetails.owners) {
      const slicedString = (await owner.getText()).slice(0, 21);
      await expect(expectedStakedPool.owners.some((x) => x.includes(slicedString))).to.be.true;
    }
  }

  async assertSeeStakePoolDetailsCommonElements() {
    await StakePoolDetails.poolName.waitForClickable();
    await StakePoolDetails.poolLogo.waitForDisplayed();

    await expect(await StakePoolDetails.statisticsTitle.getText()).to.equal(
      await t('browserView.staking.details.statistics.title')
    );
    await expect(await StakePoolDetails.activeStakeTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.activeStake')
    );
    await expect(await StakePoolDetails.apyTitle.getText()).to.equal('ROS');
    // TODO BUG LW-5635
    // await expect((await StakePoolDetails.apyValue.getText()) as string).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);

    await expect(((await StakePoolDetails.activeStakeValue.getText()) as string).slice(0, -1)).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
    await expect(await StakePoolDetails.saturationTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.saturation')
    );
    await expect((await StakePoolDetails.saturationValue.getText()) as string).to.match(
      TestnetPatterns.PERCENT_DOUBLE_REGEX
    );
    await expect(await StakePoolDetails.delegatorsTitle.getText()).to.equal(
      await t('cardano.stakePoolMetricsBrowser.delegators')
    );
    await expect((await StakePoolDetails.delegatorsValue.getText()) as string).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
  }
}

export default new StakePoolDetailsAssert();
