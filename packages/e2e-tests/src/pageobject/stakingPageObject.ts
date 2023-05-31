import webTester from '../actor/webTester';
import { StakingInfoComponent } from '../elements/staking/stakingInfoComponent';
import StakePoolDetails from '../elements/staking/stakePoolDetails';
import simpleTxSideDrawerPageObject from './simpleTxSideDrawerPageObject';

export default new (class StakingPageObject {
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

  async getPoolName() {
    return await webTester.getTextValueFromElement(new StakingInfoComponent().poolName());
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
})();
