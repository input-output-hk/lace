import webTester from '../actor/webTester';
import { StakingInfoComponent } from '../elements/staking/stakingInfoComponent';
import StakePoolDetails from '../elements/staking/stakePoolDetails';
import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';
import { browser } from '@wdio/globals';
import StakingPage from '../elements/staking/stakingPage';

class StakingPageObject {
  async clickStakePoolWithName(poolName: string) {
    await StakingPage.stakingPoolWithName(poolName).click();
  }

  async fillSearch(term: string) {
    await StakingPage.stakingPageSearchInput.waitForEnabled();
    await StakingPage.stakingPageSearchInput.scrollIntoView();
    await StakingPage.stakingPageSearchInput.click();
    await browser.keys([...term]);
    await browser.pause(500);
  }

  async clickPoolNameInStakingInfoComponent() {
    await webTester.clickElement(new StakingInfoComponent().poolName());
  }

  async hoverLastRewardInStakingInfoComponent() {
    await webTester.hoverOnWebElement(new StakingInfoComponent().statsLastReward().value());
  }

  async hoverTotalStakedInStakingInfoComponent() {
    await webTester.hoverOnWebElement(new StakingInfoComponent().statsTotalStaked().value());
  }

  async hoverTotalRewardsInStakingInfoComponent() {
    await webTester.hoverOnWebElement(new StakingInfoComponent().statsTotalRewards().value());
  }

  async getPoolIdFromStakePoolDetails(mode: 'extended' | 'popup') {
    await this.clickPoolNameInStakingInfoComponent();
    await StakePoolDetails.poolId.waitForDisplayed();
    const poolId = await StakePoolDetails.poolId.getText();
    await (mode === 'popup'
      ? simpleTxSideDrawerPageObject.clickBackDrawerButton()
      : simpleTxSideDrawerPageObject.clickCloseDrawerButton());
    return poolId;
  }
}

export default new StakingPageObject();
