import MultidelegationPage from '../../elements/multidelegation/MultidelegationPage';
import { browser } from '@wdio/globals';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { TestnetPatterns } from '../../support/patterns';
import NetworkComponent from '../../elements/staking/networkComponent';

class MultidelegationPageAssert {
  assertSeeStakingOnPoolsCounter = async (poolsCount: number) => {
    await MultidelegationPage.delegationCardPoolsValue.waitForClickable();
    const poolsCounter = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    expect(poolsCounter).to.equal(poolsCount);
  };

  assertSeeSearchResultsCountExact = async (items: number) => {
    await browser.waitUntil(async () => (await MultidelegationPage.poolsItems.length) === items, {
      timeout: 20_000,
      timeoutMsg: `Search result does not match exact items count expected: ${items}`
    });
  };

  assertSeeSearchResultsCountMinimum = async (items: number) => {
    await browser.waitUntil(async () => (await MultidelegationPage.poolsItems.length) >= items, {
      timeout: 20_000,
      timeoutMsg: `Search result does not match minimum items count expected: ${items}`
    });
  };

  assertSeeTitle = async () => {
    expect(await MultidelegationPage.title.getText()).to.equal(await t('staking.sectionTitle'));
  };

  assertSeeDelegationCardDetailsInfo = async () => {
    expect(await MultidelegationPage.delegationCardBalanceLabel.getText()).to.equal(
      await t('overview.delegationCard.label.balance', 'staking')
    );
    const adaValue = Number((await MultidelegationPage.delegationCardBalanceValue.getText()).split(' ')[0]);
    expect(adaValue).to.be.greaterThan(0);
    expect(await MultidelegationPage.delegationCardPoolsLabel.getText()).to.equal(
      await t('overview.delegationCard.label.pools', 'staking')
    );
    const poolsCount = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    expect(poolsCount).to.be.greaterThan(0);
    expect(await MultidelegationPage.delegationCardStatusLabel.getText()).to.equal(
      await t('overview.delegationCard.label.status', 'staking')
    );
    const statusValue = await MultidelegationPage.delegationCardStatusValue.getText();
    poolsCount === 1
      ? expect(statusValue).to.equal(await t('overview.delegationCard.statuses.simpleDelegation', 'staking'))
      : expect(statusValue).to.equal(await t('overview.delegationCard.statuses.multiDelegation', 'staking'));
    expect(await MultidelegationPage.delegationCardChartSlices.length).to.equal(poolsCount);
  };

  assertSeeDelegatedPoolCardsPopup = async () => {
    const poolsCount = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    for (let i = 0; i < poolsCount; i++) {
      await this.assertSeeDelegatedPoolDetailsInfo(i);
      await this.assertSeeDelegatedPoolFundsInfo(i);
    }
  };

  assertSeeDelegatedPoolDetailsInfo = async (index: number) => {
    await MultidelegationPage.delegatedPoolLogo(index).waitForClickable();
    await MultidelegationPage.delegatedPoolName(index).waitForClickable();
    await MultidelegationPage.delegatedPoolTicker(index).waitForClickable();
    expect(await MultidelegationPage.delegatedPoolRosTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.ros', 'staking')
    );
    const rosValue = await MultidelegationPage.delegatedPoolRosValue(index).getText();
    if (rosValue !== '-') {
      expect(rosValue).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    }
    expect(await MultidelegationPage.delegatedPoolFeeTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.fee', 'staking')
    );
    const feeValueNumber = (await MultidelegationPage.delegatedPoolFeeValue(index).getText()).split('tADA')[0];
    expect(feeValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolMarginTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.margin', 'staking')
    );
    expect(await MultidelegationPage.delegatedPoolMarginValue(index).getText()).to.match(
      TestnetPatterns.PERCENT_DOUBLE_REGEX
    );
  };

  assertSeeDelegatedPoolFundsInfo = async (index: number) => {
    expect(await MultidelegationPage.delegatedPoolStakedTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.totalStaked', 'staking')
    );
    const stakedValueNumber = (await MultidelegationPage.delegatedPoolStakedValue(index).getText()).split('tADA')[0];
    expect(stakedValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolLastRewardsTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.lastReward', 'staking')
    );
    const lastRewardsValueNumber = (await MultidelegationPage.delegatedPoolLastRewardsValue(index).getText()).split(
      'tADA'
    )[0];
    expect(lastRewardsValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  };

  assertSeeStakingPoolOnYourPoolsList = async (poolName: string) => {
    await browser.waitUntil(
      async () => {
        const delegatedPoolsCount = await MultidelegationPage.delegatedPoolItems.length;
        const delegatedPoolsNames = [];
        for (let index = 0; index < delegatedPoolsCount; index++) {
          delegatedPoolsNames.push(await MultidelegationPage.delegatedPoolName(index).getText());
        }
        return delegatedPoolsNames.includes(poolName);
      },
      {
        timeout: 180_000,
        interval: 2000,
        timeoutMsg: `failed while waiting for stake pool: ${poolName}`
      }
    );
  };

  assertNetworkContainerExistsWithContent = async () => {
    await NetworkComponent.networkContainer.waitForDisplayed();
    await NetworkComponent.networkTitle.waitForDisplayed();
    expect(await NetworkComponent.networkTitle.getText()).to.equal(await t('cardano.networkInfo.title'));
    await NetworkComponent.currentEpochLabel.waitForDisplayed();
    expect(await NetworkComponent.currentEpochLabel.getText()).to.equal(await t('cardano.networkInfo.currentEpoch'));
    await NetworkComponent.currentEpochDetail.waitForDisplayed();
    expect(await NetworkComponent.currentEpochDetail.getText()).to.match(TestnetPatterns.NUMBER_REGEX);
    await NetworkComponent.epochEndLabel.waitForDisplayed();
    expect(await NetworkComponent.epochEndLabel.getText()).to.equal(await t('cardano.networkInfo.epochEnd'));
    await NetworkComponent.epochEndDetail.waitForDisplayed();
    await NetworkComponent.totalPoolsLabel.waitForDisplayed();
    expect(await NetworkComponent.totalPoolsLabel.getText()).to.equal(await t('cardano.networkInfo.totalPools'));
    await NetworkComponent.totalPoolsDetail.waitForDisplayed();
    expect(await NetworkComponent.totalPoolsDetail.getText()).to.match(TestnetPatterns.NUMBER_REGEX);
    await NetworkComponent.percentageStakedLabel.waitForDisplayed();
    expect(await NetworkComponent.percentageStakedLabel.getText()).to.equal(
      await t('cardano.networkInfo.percentageStaked')
    );
    await NetworkComponent.percentageStakedDetail.waitForDisplayed();
    expect(await NetworkComponent.percentageStakedDetail.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  };
}

export default new MultidelegationPageAssert();
