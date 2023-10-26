import { expect } from 'chai';
import { t } from '../../utils/translationService';
import StakingConfirmationDrawer from '../../elements/multidelegation/StakingConfirmationDrawer';

class StakingConfirmationDrawerAssert {
  assertSeeStakingConfirmationDrawer = async () => {
    await StakingConfirmationDrawer.drawerHeaderBackButton.waitForDisplayed();
    await StakingConfirmationDrawer.drawerHeaderCloseButton.waitForDisplayed();
    await StakingConfirmationDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await StakingConfirmationDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('drawer.titleSecond', 'staking')
    );
    await StakingConfirmationDrawer.title.waitForDisplayed();
    expect(await StakingConfirmationDrawer.title.getText()).to.equal(await t('drawer.confirmation.title', 'staking'));
    await StakingConfirmationDrawer.subtitle.waitForDisplayed();
    expect(await StakingConfirmationDrawer.subtitle.getText()).to.equal(
      await t('drawer.confirmation.subTitle', 'staking')
    );
    await StakingConfirmationDrawer.delegateFrom.waitForDisplayed();
    await StakingConfirmationDrawer.delegateTo.waitForDisplayed();
    await StakingConfirmationDrawer.transactionCostTitle.waitForDisplayed();
    await StakingConfirmationDrawer.transactionFeeLabel.waitForDisplayed();
    await StakingConfirmationDrawer.nextButton.waitForDisplayed();
    expect(await StakingConfirmationDrawer.nextButton.getText()).to.equal(
      await t('drawer.confirmation.button.confirm', 'staking')
    );
  };
}

export default new StakingConfirmationDrawerAssert();
