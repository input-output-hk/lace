import { expect } from 'chai';
import { t } from '../../utils/translationService';
import ManageStakingDrawer from '../../elements/multidelegation/ManageStakingDrawer';

class ManageStakingDrawerAssert {
  assertSeeManageStakingDrawer = async (manageButtonInitiated = false) => {
    await ManageStakingDrawer.drawerHeaderCloseButton.waitForDisplayed();
    await ManageStakingDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await ManageStakingDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('drawer.titleSecond', 'staking')
    );
    await ManageStakingDrawer.infoCard.waitForDisplayed();
    await ManageStakingDrawer.selectedPoolsLabel.waitForDisplayed();
    await ManageStakingDrawer.addPoolsButton.waitForDisplayed();
    if (!manageButtonInitiated) {
      await ManageStakingDrawer.nextButton.waitForDisplayed();
      expect(await ManageStakingDrawer.nextButton.getText()).to.equal(
        await t('drawer.preferences.confirmButton', 'staking')
      );
    }
  };
}

export default new ManageStakingDrawerAssert();
