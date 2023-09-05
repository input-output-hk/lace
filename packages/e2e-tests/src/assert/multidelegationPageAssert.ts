import MultidelegationPage from '../elements/staking/MultidelegationPage';
import { browser } from '@wdio/globals';
import { expect } from 'chai';
import { t } from '../utils/translationService';

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

  async assertSeeDelegationCardWithPoolsCount() {
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
  }
}

export default new MultidelegationPageAssert();
