import StakingInfoComponent from '../elements/staking/stakingInfoComponent';
import StakePoolDetails from '../elements/staking/stakePoolDetails';
import { browser } from '@wdio/globals';
import StakingPage from '../elements/staking/stakingPage';

class StakingPageObject {
  async clickStakePoolWithName(poolName: string) {
    await StakingPage.stakingPoolWithName(poolName).waitForClickable();
    await StakingPage.stakingPoolWithName(poolName).click();
  }

  async fillSearch(term: string) {
    await StakingPage.stakingPageSearchInput.waitForClickable();
    await StakingPage.stakingPageSearchInput.scrollIntoView();
    await StakingPage.stakingPageSearchInput.click();
    await browser.keys([...term]);
    await browser.pause(500);
  }

  async clickPoolNameInStakingInfoComponent() {
    await StakingInfoComponent.poolName.click();
  }

  async getPoolIdFromStakePoolDetails(mode: 'extended' | 'popup') {
    await this.clickPoolNameInStakingInfoComponent();
    await StakePoolDetails.poolId.waitForDisplayed();
    const poolId = await StakePoolDetails.poolId.getText();
    await (mode === 'popup' ? StakePoolDetails.clickBackDrawerButton() : StakePoolDetails.clickCloseDrawerButton());
    return poolId;
  }
}

export default new StakingPageObject();
