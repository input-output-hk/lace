import MultidelegationPage from '../elements/staking/MultidelegationPage';
import { browser } from '@wdio/globals';
import { expect } from 'chai';
import { t } from '../utils/translationService';
import { TestnetPatterns } from '../support/patterns';

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
    await MultidelegationPage.delegationCardLooksCorrectly();
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
      await expect(rosValue).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    }
    expect(await MultidelegationPage.delegatedPoolFeeTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.fee', 'staking')
    );
    const feeValueNumber = (await MultidelegationPage.delegatedPoolFeeValue(index).getText()).split('tADA')[0];
    await expect(feeValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolMarginTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.margin', 'staking')
    );
    await expect(await MultidelegationPage.delegatedPoolMarginValue(index).getText()).to.match(
      TestnetPatterns.PERCENT_DOUBLE_REGEX
    );
  };

  assertSeeDelegatedPoolFundsInfo = async (index: number) => {
    expect(await MultidelegationPage.delegatedPoolStakedTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.totalStaked', 'staking')
    );
    const stakedValueNumber = (await MultidelegationPage.delegatedPoolStakedValue(index).getText()).split('tADA')[0];
    await expect(stakedValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolLastRewardsTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.lastReward', 'staking')
    );
    const lastRewardsValueNumber = (await MultidelegationPage.delegatedPoolLastRewardsValue(index).getText()).split(
      'tADA'
    )[0];
    await expect(lastRewardsValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  };
}

export default new MultidelegationPageAssert();
