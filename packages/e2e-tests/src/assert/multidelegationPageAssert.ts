import MultidelegationPage from '../elements/staking/MultidelegationPage';
import { browser } from '@wdio/globals';

class MultidelegationPageAssert {
  assertSeeStakingOnPoolsCounter = async (number?: number) => {
    await MultidelegationPage.delegationcardPoolsValue.waitForClickable();
    const poolsCount = Number(await MultidelegationPage.delegationcardPoolsValue.getText()).valueOf();
    expect(poolsCount).toBe(number);
  };

  assertSeeSearchResultsCount = async (items: number) => {
    await browser.waitUntil(async () => (await MultidelegationPage.poolsItems.length) >= items, {
      timeout: 20_000,
      timeoutMsg: 'failed while waiting for single search result'
    });
  };
}

export default new MultidelegationPageAssert();
