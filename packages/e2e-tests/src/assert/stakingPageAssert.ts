import StakingPage from '../elements/staking/stakingPage';
import { TestnetPatterns } from '../support/patterns';
import StakingInfoComponent from '../elements/staking/stakingInfoComponent';
import { t } from '../utils/translationService';
import StakingSuccessDrawer from '../elements/staking/StakingSuccessDrawer';
import { expect } from 'chai';
import { StakePool } from '../data/expectedStakePoolsData';
import StakingPasswordDrawer from '../elements/staking/StakingPasswordDrawer';
import StakingErrorDrawer from '../elements/staking/StakingErrorDrawer';
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

    expect(await StakingInfoComponent.statsApy.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.ros')
    );
    // TODO BUG LW-5635
    // expect((await webTester.getTextValueFromElement(stakingInfoComponent.statsApy().value())) as string).to.match(
    //   TestnetPatterns.PERCENT_DOUBLE_REGEX
    // );

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

  assertStakingSuccessDrawer = async (process: 'Initial' | 'Switching', mode: 'extended' | 'popup') => {
    await StakingSuccessDrawer.drawerHeaderCloseButton.waitForDisplayed();
    if (mode === 'extended') {
      await StakingSuccessDrawer.drawerNavigationTitle.waitForDisplayed();
      expect(await StakingSuccessDrawer.drawerNavigationTitle.getText()).to.equal(
        await t('browserView.staking.details.titleSecond')
      );
    }
    await StakingSuccessDrawer.resultIcon.waitForDisplayed();
    await StakingSuccessDrawer.resultTitle.waitForDisplayed();
    expect(await StakingSuccessDrawer.resultTitle.getText()).to.equal(
      process === 'Initial'
        ? await t('browserView.staking.details.success.title')
        : await t('browserView.staking.details.switchedPools.title')
    );
    await StakingSuccessDrawer.resultSubtitle.waitForDisplayed();
    // TODO: uncomment when LW-4864 is resolved
    // expect(await StakingSuccessDrawer.resultSubtitle.getText()).to.equal(
    //   process === 'Initial'
    //     ? await t('browserView.staking.details.success.subTitle')
    //     : await t('browserView.staking.details.switchedPools.subTitle')
    // );

    await StakingSuccessDrawer.closeButton.waitForDisplayed();
    expect(await StakingSuccessDrawer.closeButton.getText()).to.equal(await t('general.button.close'));
  };

  assertSeeSingleSearchResult = async () => {
    await browser.waitUntil(async () => (await StakingPage.counter.getText()) === '(1)', {
      timeout: 20_000,
      timeoutMsg: 'failed while waiting for single search result'
    });
  };

  assertSeeStakingPasswordDrawer = async () => {
    await StakingPasswordDrawer.title.waitForDisplayed();
    expect(await StakingPasswordDrawer.title.getText()).to.equal(
      await t('browserView.staking.details.confirmation.title')
    );
    await StakingPasswordDrawer.subtitle.waitForDisplayed();
    expect(await StakingPasswordDrawer.subtitle.getText()).to.equal(
      await t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')
    );
    await StakingPasswordDrawer.passwordInputContainer.waitForDisplayed();
    await StakingPasswordDrawer.confirmButton.waitForDisplayed();
    expect(await StakingPasswordDrawer.confirmButton.getText()).to.equal(await t('general.button.confirm'));
  };

  assertSeeStakingError = async () => {
    await StakingErrorDrawer.icon.waitForDisplayed();
    await StakingErrorDrawer.title.waitForDisplayed();
    expect(await StakingErrorDrawer.title.getText()).to.equal(await t('browserView.staking.details.fail.title'));
    await StakingErrorDrawer.description.waitForDisplayed();
    expect(await StakingErrorDrawer.description.getText()).to.equal(
      await t('browserView.staking.details.fail.description')
    );
    await StakingErrorDrawer.retryButton.waitForDisplayed();
    expect(await StakingErrorDrawer.retryButton.getText()).to.equal(
      await t('browserView.staking.details.fail.btn.retry')
    );
    await StakingErrorDrawer.closeButton.waitForDisplayed();
    expect(await StakingErrorDrawer.closeButton.getText()).to.equal(
      await t('browserView.staking.details.fail.btn.close')
    );
  };

  async assertSeeTickerInCostColumn(expectedTicker: 'ADA' | 'tADA') {
    const regex = expectedTicker === 'ADA' ? /[^t]ADA/g : /tADA/g;

    const tickerList = await StakingPage.stakePoolListCostList.map(async (stakePoolListCost) =>
      String(((await stakePoolListCost.getText()) as string).match(regex))
    );
    this.assertTickerInList(expectedTicker, tickerList);
  }

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
