import MultidelegationPage from '../elements/staking/MultidelegationPage';
import { browser } from '@wdio/globals';
import { expect } from 'chai';

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
}

export default new MultidelegationPageAssert();
