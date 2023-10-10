import StakingPasswordDrawer from '../../elements/multidelegation/StakingPasswordDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class StakingPasswordDrawerAssert {
  assertSeeStakingPasswordDrawer = async () => {
    await StakingPasswordDrawer.drawerHeaderBackButton.waitForDisplayed();
    await StakingPasswordDrawer.drawerHeaderCloseButton.waitForDisplayed();
    await StakingPasswordDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await StakingPasswordDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('drawer.titleSecond', 'staking')
    );
    await StakingPasswordDrawer.title.waitForDisplayed();
    expect(await StakingPasswordDrawer.title.getText()).to.equal(await t('drawer.sign.confirmation.title', 'staking'));
    await StakingPasswordDrawer.subtitle.waitForDisplayed();
    expect(await StakingPasswordDrawer.subtitle.getText()).to.equal(
      await t('drawer.sign.enterWalletPasswordToConfirmTransaction', 'staking')
    );
    await StakingPasswordDrawer.passwordInputContainer.waitForDisplayed();
    await StakingPasswordDrawer.confirmButton.waitForDisplayed();
    expect(await StakingPasswordDrawer.confirmButton.getText()).to.equal(await t('general.button.confirm'));
  };
}

export default new StakingPasswordDrawerAssert();
