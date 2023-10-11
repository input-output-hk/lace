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
      await StakePoolDetails.socialLinksTitle.waitForDisplayed({ reverse: true });
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed({ reverse: true });
    } else {
      expect(await StakePoolDetails.socialLinksTitle.getText()).to.equal(await t('drawer.details.social', 'staking'));
      await StakePoolDetails.socialWebsiteIcon.waitForDisplayed();
    }

    if (staked) {
      await StakePoolDetails.delegatedBadge.waitForDisplayed();
      await StakePoolDetails.delegatedBadge.moveTo();
      await StakePoolDetails.tooltip.waitForDisplayed();
      expect(await StakePoolDetails.tooltip.getText()).to.equal(await t('drawer.details.status.delegating', 'staking'));
    } else {
      await StakePoolDetails.selectPoolForMultiStakingButton.waitForDisplayed();
      expect(await StakePoolDetails.selectPoolForMultiStakingButton.getText()).to.equal(
        await t('drawer.details.selectForMultiStaking', 'staking')
      );
    }
    await StakePoolDetails.stakeAllOnThisPoolButton.waitForDisplayed();
    expect(await StakePoolDetails.stakeAllOnThisPoolButton.getText()).to.equal(
      await t('drawer.details.stakeOnPoolButton', 'staking')
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
    await StakePoolDetails.poolName.waitForClickable();
    await StakePoolDetails.poolLogo.waitForDisplayed();

    expect(await StakePoolDetails.statisticsTitle.getText()).to.equal(await t('drawer.details.statistics', 'staking'));
    expect(await StakePoolDetails.activeStakeTitle.getText()).to.equal(
      await t('drawer.details.metrics.activeStake', 'staking')
    );
    expect(await StakePoolDetails.apyTitle.getText()).to.equal(await t('drawer.details.metrics.apy', 'staking'));
    // TODO BUG LW-5635
    // await expect(await StakePoolDetails.apyValue.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);

    expect((await StakePoolDetails.activeStakeValue.getText()).slice(0, -1)).to.match(
      TestnetPatterns.NUMBER_DOUBLE_REGEX
    );
    expect(await StakePoolDetails.saturationTitle.getText()).to.equal(
      await t('drawer.details.metrics.saturation', 'staking')
    );
    expect(await StakePoolDetails.saturationValue.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    expect(await StakePoolDetails.delegatorsTitle.getText()).to.equal(
      await t('drawer.details.metrics.delegators', 'staking')
    );
    expect(await StakePoolDetails.delegatorsValue.getText()).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  }

  async assertStakePoolDetailsDrawerIsNotOpened() {
    await StakePoolDetails.container.waitForDisplayed({ reverse: true });
  }
}

export default new StakePoolDetailsAssert();
