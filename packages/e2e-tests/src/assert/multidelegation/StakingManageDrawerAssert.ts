import { expect } from 'chai';
import { t } from '../../utils/translationService';
import StakingManageDrawer from '../../elements/multidelegation/StakingManageDrawer';

class StakingManageDrawerAssert {
  assertSeeStakingManageDrawer = async () => {
    await StakingManageDrawer.drawerHeaderCloseButton.waitForDisplayed();
    await StakingManageDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await StakingManageDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('drawer.titleSecond', 'staking')
    );
    await StakingManageDrawer.infoCard.waitForDisplayed();
    await StakingManageDrawer.selectedPoolsLabel.waitForDisplayed();
    await StakingManageDrawer.addPoolsButton.waitForDisplayed();
    await StakingManageDrawer.nextButton.waitForDisplayed();
    await StakingManageDrawer.nextButton.waitForDisplayed();
    expect(await StakingManageDrawer.nextButton.getText()).to.equal(
      await t('drawer.preferences.confirmButton', 'staking')
    );
  };
}

export default new StakingManageDrawerAssert();
