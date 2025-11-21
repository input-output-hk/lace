import StakingInfoComponent from '../elements/staking/stakingInfoComponent';
import StakePoolDetails from '../elements/staking/stakePoolDetails';

class StakingPageObject {
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
