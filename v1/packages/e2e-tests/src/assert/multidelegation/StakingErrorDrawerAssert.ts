import StakingErrorDrawer from '../../elements/multidelegation/StakingErrorDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class StakingErrorDrawerAssert {
  assertSeeStakingError = async () => {
    await StakingErrorDrawer.icon.waitForDisplayed();
    await StakingErrorDrawer.title.waitForDisplayed();
    expect(await StakingErrorDrawer.title.getText()).to.equal(await t('browserView.staking.details.fail.title'));
    await StakingErrorDrawer.description.waitForDisplayed();
    expect(await StakingErrorDrawer.description.getText()).to.equal(
      await t('browserView.staking.details.fail.description')
    );
    await StakingErrorDrawer.retryButton.waitForDisplayed();
    expect(await StakingErrorDrawer.retryButton.getText()).to.equal(
      await t('browserView.staking.details.fail.btn.retry')
    );
    await StakingErrorDrawer.closeButton.waitForDisplayed();
    expect(await StakingErrorDrawer.closeButton.getText()).to.equal(
      await t('browserView.staking.details.fail.btn.close')
    );
  };
}

export default new StakingErrorDrawerAssert();
