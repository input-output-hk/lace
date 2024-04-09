import { StakePool } from '../../data/expectedStakePoolsData';
import StakePoolDetails from '../../elements/multidelegation/StakePoolDetailsDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { TestnetPatterns } from '../../support/patterns';
import { isPopupMode } from '../../utils/pageUtils';

class StakePoolDetailsAssert {
  async assertSeeStakePoolDetailsPage(expectedStakedPool: StakePool, staked: boolean, noMetaDataPool = false) {
    (await isPopupMode())
      ? await StakePoolDetails.drawerHeaderBackButton.waitForClickable()
      : await StakePoolDetails.drawerHeaderCloseButton.waitForClickable();

    await this.assertSeeStakePoolDetailsCommonElements();

    expect(await StakePoolDetails.poolName.getText()).to.equal(expectedStakedPool.name);
    expect(await StakePoolDetails.poolTicker.getText()).to.equal(expectedStakedPool.ticker);
    expect(await StakePoolDetails.informationDescription.getText()).to.equal(expectedStakedPool.information);

    if (noMetaDataPool) {
      const shortPoolId = `${expectedStakedPool.poolId.slice(0, 6)}...${expectedStakedPool.poolId.slice(-8)}`;
      expect(await StakePoolDetails.poolTicker.getText()).to.equal(shortPoolId);
      await StakePoolDetails.socialLinksTitle.waitForDisplayed({ reverse: true });
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed({ reverse: true });
    } else {
      expect(await StakePoolDetails.poolTicker.getText()).to.equal(expectedStakedPool.ticker);
      expect(await StakePoolDetails.socialLinksTitle.getText()).to.equal(await t('drawer.details.social', 'staking'));
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed();
    }

    if (staked) {
      await StakePoolDetails.delegatedBadge.waitForDisplayed();
      await StakePoolDetails.delegatedBadge.moveTo();
      await StakePoolDetails.tooltip.waitForDisplayed();
      expect(await StakePoolDetails.tooltip.getText()).to.equal(await t('drawer.details.status.delegating', 'staking'));
    }

    await this.assertSeeDrawerButtons(staked);

    await StakePoolDetails.selectPoolForMultiStakingButton.waitForDisplayed();
    expect(await StakePoolDetails.selectPoolForMultiStakingButton.getText()).to.equal(
      await t('drawer.details.selectForMultiStaking', 'staking')
    );

    expect(await StakePoolDetails.informationTitle.getText()).to.equal(
      await t('drawer.details.information', 'staking')
    );
    expect(await StakePoolDetails.poolIdsTitle.getText()).to.equal(await t('drawer.details.poolIds', 'staking'));
    expect(await StakePoolDetails.poolId.getText()).to.equal(expectedStakedPool.poolId);

    expect(await StakePoolDetails.ownersTitle.getText()).to.equal(`${await t('drawer.details.owners', 'staking')} (1)`);

    for (const displayedOwner of await StakePoolDetails.owners) {
      const slicedString = (await displayedOwner.getText()).slice(0, 21);
      expect(expectedStakedPool.owners.some((owner) => owner.includes(slicedString))).to.be.true;
    }
  }

  async assertSeeStakePoolDetailsCommonElements() {
    await StakePoolDetails.poolName.waitForStable();
    await StakePoolDetails.poolName.waitForClickable();
    await StakePoolDetails.poolLogo.waitForDisplayed();

    expect(await StakePoolDetails.statisticsTitle.getText()).to.equal(await t('drawer.details.statistics', 'staking'));
    await StakePoolDetails.activeStakeTitle.waitForDisplayed();

    await this.assertSeeActiveStake();
    await this.assertSeeLiveStake();
    await this.assertSeeDelegators();
    await this.assertSeeROS();
    await this.assertSeeBlocks();
    await this.assertSeeCostPerEpoch();
    await this.assertSeePledge();
    await this.assertSeePoolMargin();
    await this.assertSeeSaturation();
  }

  private async assertSeeSaturation() {
    await StakePoolDetails.saturationTitle.waitForDisplayed();
    expect(await StakePoolDetails.saturationTitle.getText()).to.equal(
      await t('drawer.details.metrics.saturation', 'staking')
    );
    await StakePoolDetails.saturationProgressBar.waitForDisplayed({ reverse: await isPopupMode() });
    await StakePoolDetails.saturationValue.waitForDisplayed();
    expect(await StakePoolDetails.saturationValue.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  }

  private async assertSeePoolMargin() {
    await StakePoolDetails.poolMarginTitle.waitForDisplayed();
    expect(await StakePoolDetails.poolMarginTitle.getText()).to.equal(
      await t('drawer.details.metrics.margin', 'staking')
    );
    await StakePoolDetails.poolMarginValue.waitForDisplayed();
    expect(await StakePoolDetails.poolMarginValue.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  }

  private async assertSeePledge() {
    await StakePoolDetails.pledgeTitle.waitForDisplayed();
    expect(await StakePoolDetails.pledgeTitle.getText()).to.equal(await t('drawer.details.metrics.pledge', 'staking'));
    await StakePoolDetails.pledgeValue.waitForDisplayed();
    expect((await StakePoolDetails.pledgeValue.getText()).replace('\n', '')).to.match(TestnetPatterns.PLEDGE_REGEX);
  }

  private async assertSeeCostPerEpoch() {
    await StakePoolDetails.costPerEpochTitle.waitForDisplayed();
    expect(await StakePoolDetails.costPerEpochTitle.getText()).to.equal(
      await t('drawer.details.metrics.cost', 'staking')
    );
    await StakePoolDetails.costPerEpochValue.waitForDisplayed();
    expect(await StakePoolDetails.costPerEpochValue.getText()).to.match(TestnetPatterns.NUMBER_REGEX);
  }

  private async assertSeeBlocks() {
    await StakePoolDetails.blocksTitle.waitForDisplayed();
    expect(await StakePoolDetails.blocksTitle.getText()).to.equal(await t('drawer.details.metrics.blocks', 'staking'));
    await StakePoolDetails.blocksValue.waitForDisplayed();
    expect((await StakePoolDetails.blocksValue.getText()).replaceAll(',', '')).to.match(TestnetPatterns.BLOCKS_REGEX);
  }

  private async assertSeeROS() {
    await StakePoolDetails.rosTitle.waitForDisplayed();
    expect(await StakePoolDetails.rosTitle.getText()).to.equal(await t('drawer.details.metrics.ros', 'staking'));
    await StakePoolDetails.rosValue.waitForDisplayed();
    // TODO BUG LW-5635
    // expect(await StakePoolDetails.rosValue.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  }

  private async assertSeeDelegators() {
    await StakePoolDetails.delegatorsTitle.waitForDisplayed();
    expect(await StakePoolDetails.delegatorsTitle.getText()).to.equal(
      await t('drawer.details.metrics.delegators', 'staking')
    );
    await StakePoolDetails.delegatorsValue.waitForDisplayed();
    expect(await StakePoolDetails.delegatorsValue.getText()).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  }

  private async assertSeeLiveStake() {
    await StakePoolDetails.liveStakeTitle.waitForDisplayed();
    expect(await StakePoolDetails.liveStakeTitle.getText()).to.equal(
      await t('drawer.details.metrics.liveStake', 'staking')
    );
    await StakePoolDetails.liveStakeValue.waitForDisplayed();
    expect((await StakePoolDetails.liveStakeValue.getText()).slice(0, -1)).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
  }

  private async assertSeeActiveStake() {
    expect(await StakePoolDetails.activeStakeTitle.getText()).to.equal(
      await t('drawer.details.metrics.activeStake', 'staking')
    );
    await StakePoolDetails.activeStakeValue.waitForDisplayed();
    expect((await StakePoolDetails.activeStakeValue.getText()).slice(0, -1)).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
  }

  async assertStakePoolDetailsDrawerIsDisplayed(shouldBeDisplayed = true) {
    await StakePoolDetails.container.waitForDisplayed({ reverse: !shouldBeDisplayed });
  }

  assertSeeStakeAllOnThisPoolButton = async () => {
    await StakePoolDetails.stakeAllOnThisPoolButton.waitForClickable();
    expect(await StakePoolDetails.stakeAllOnThisPoolButton.getText()).to.equal(
      await t('drawer.details.stakeOnPoolButton', 'staking')
    );
  };

  assertSeeManageDelegationButton = async () => {
    await StakePoolDetails.manageDelegationButton.waitForClickable();
    expect(await StakePoolDetails.manageDelegationButton.getText()).to.equal(
      await t('drawer.details.manageDelegation', 'staking')
    );
  };

  assertSeeSelectPoolForMultiStakingButton = async () => {
    await StakePoolDetails.selectPoolForMultiStakingButton.waitForClickable();
    expect(await StakePoolDetails.selectPoolForMultiStakingButton.getText()).to.equal(
      await t('drawer.details.selectForMultiStaking', 'staking')
    );
  };
  assertSeeDrawerButtons = async (delegated: boolean, numberOfButtons = 2) => {
    if (delegated) {
      await this.assertSeeManageDelegationButton();
      if (numberOfButtons === 3) {
        await this.assertSeeStakeAllOnThisPoolButton();
      }
    } else {
      await this.assertSeeStakeAllOnThisPoolButton();
    }
    await this.assertSeeSelectPoolForMultiStakingButton();
  };
}

export default new StakePoolDetailsAssert();
