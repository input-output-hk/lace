import webTester from '../actor/webTester';
import { StakingPage } from '../elements/staking/stakingPage';

export default new (class StakingExtendedPageObject {
  fillSearch = async (term: string) => {
    await browser.pause(500);
    await webTester.fillComponent(new StakingPage().stakingPageSearchInput(), term);
    await browser.pause(500);
  };

  async clickStakepoolWithName(poolName: string) {
    await webTester.clickElement(new StakingPage().stakingPopupPoolWithName(poolName));
  }
})();
