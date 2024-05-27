import StakingSuccessDrawer from '../../elements/multidelegation/StakingSuccessDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class StakingSuccessDrawerAssert {
  assertSeeStakingSuccessDrawer = async (process: 'Initial' | 'Switching') => {
    await StakingSuccessDrawer.drawerHeaderCloseButton.waitForDisplayed();
    await StakingSuccessDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await StakingSuccessDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('drawer.titleSecond', 'staking')
    );
    await StakingSuccessDrawer.resultIcon.waitForDisplayed();
    await StakingSuccessDrawer.resultTitle.waitForDisplayed();
    expect(await StakingSuccessDrawer.resultTitle.getText()).to.equal(
      process === 'Initial'
        ? await t('drawer.success.title', 'staking')
        : await t('drawer.success.switchedPools.title', 'staking')
    );
    await StakingSuccessDrawer.resultSubtitle.waitForDisplayed();
    expect(await StakingSuccessDrawer.resultSubtitle.getText()).to.equal(
      process === 'Initial'
        ? await t('drawer.success.subTitle', 'staking')
        : await t('drawer.success.switchedPools.subTitle', 'staking')
    );

    await StakingSuccessDrawer.closeButton.waitForDisplayed();
    expect(await StakingSuccessDrawer.closeButton.getText()).to.equal(await t('general.button.close'));
  };
}

export default new StakingSuccessDrawerAssert();
