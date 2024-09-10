import StakingPage from '../elements/staking/stakingPage';
import { TestnetPatterns } from '../support/patterns';
import StakingInfoComponent from '../elements/staking/stakingInfoComponent';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import { StakePool } from '../data/expectedStakePoolsData';
import { browser } from '@wdio/globals';

class StakingPageAssert {
  assertStakePoolSwitched = async (stakePoolName: string) => {
    await browser.waitUntil(async () => (await StakingInfoComponent.poolName.getText()) === stakePoolName, {
      timeout: 180_000,
      interval: 2000,
      timeoutMsg: 'failed while waiting for stake Pool Switch'
    });
  };

  assertSeeCurrentlyStakingComponent = async (
    expectedStakePool: StakePool,
    mode: 'extended' | 'popup',
    noMetaDataPool = false
  ) => {
    expect(await StakingInfoComponent.title.getText()).to.equal(await t('browserView.staking.stakingInfo.title'));

    await StakingInfoComponent.poolLogo.waitForDisplayed();
    expect(await StakingInfoComponent.poolName.getText()).to.equal(expectedStakePool.name);

    noMetaDataPool
      ? expect(await StakingInfoComponent.poolTicker.getText()).to.contain(expectedStakePool.poolId.slice(0, 6))
      : expect(await StakingInfoComponent.poolTicker.getText()).to.equal(expectedStakePool.ticker);

    expect(await StakingInfoComponent.statsROS.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.ros')
    );
    expect(await StakingInfoComponent.statsROS.value.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);

    expect(await StakingInfoComponent.statsFee.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.Fee')
    );
    expect(await StakingInfoComponent.statsFee.value.getText()).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);

    expect(await StakingInfoComponent.statsMargin.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.Margin')
    );
    expect(await StakingInfoComponent.statsMargin.value.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);

    if (mode === 'extended') {
      expect(await StakingInfoComponent.statsTotalRewards.title.getText()).to.equal(
        await t('browserView.staking.stakingInfo.totalRewards.title')
      );

      expect(await StakingInfoComponent.statsTotalRewards.value.getText()).to.match(
        TestnetPatterns.ADA_LITERAL_VALUE_REGEX_OR_0
      );
    }

    expect(await StakingInfoComponent.statsTotalStaked.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.totalStaked.title')
    );
    expect(await StakingInfoComponent.statsTotalStaked.value.getText()).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );

    expect(await StakingInfoComponent.statsLastReward.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.lastReward.title')
    );
    expect(await StakingInfoComponent.statsLastReward.value.getText()).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );
  };

  assertSeeSingleSearchResult = async () => {
    await browser.waitUntil(async () => (await StakingPage.counter.getText()) === '(1)', {
      timeout: 20_000,
      timeoutMsg: 'failed while waiting for single search result'
    });
  };

  async assertSeeTickerInCurrentStakedPool(expectedTicker: 'ADA' | 'tADA') {
    const regex = expectedTicker === 'ADA' ? /[^t]ADA/g : /tADA/g;

    const tickerList = (await StakingPage.getStatsTickers()).map((ticker) => String(ticker.match(regex)));
    this.assertTickerInList(expectedTicker, tickerList);
  }

  assertTickerInList(expectedTicker: 'ADA' | 'tADA', tickerList: string[]) {
    if (expectedTicker === 'ADA') tickerList = tickerList.map((ticker) => ticker.trim().slice(-3));

    expect(tickerList.every((ticker) => ticker === expectedTicker)).to.be.true;
  }
}

export default new StakingPageAssert();
