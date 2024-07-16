import { expect } from 'chai';
import { t } from '../../utils/translationService';
import StakingExitModal from '../../elements/multidelegation/StakingExitModal';

class StakingExitModalAssert {
  assertSeeStakingExitModal = async () => {
    await StakingExitModal.title.waitForDisplayed();
    expect(await StakingExitModal.title.getText()).to.equal(
      await t('browserView.staking.details.exitStakingModal.title')
    );

    await StakingExitModal.description.waitForDisplayed();
    expect(await StakingExitModal.description.getText()).to.equal(
      await t('browserView.staking.details.exitStakingModal.description')
    );

    await StakingExitModal.cancelButton.waitForDisplayed();
    expect(await StakingExitModal.cancelButton.getText()).to.equal(
      await t('browserView.staking.details.exitStakingModal.buttons.cancel')
    );

    await StakingExitModal.exitButton.waitForDisplayed();
    expect(await StakingExitModal.exitButton.getText()).to.equal(
      await t('browserView.staking.details.exitStakingModal.buttons.confirm')
    );
  };

  assertDontSeeStakingExitModal = async () => {
    await StakingExitModal.title.waitForDisplayed({ reverse: true });
    await StakingExitModal.description.waitForDisplayed({ reverse: true });
    await StakingExitModal.cancelButton.waitForDisplayed({ reverse: true });
    await StakingExitModal.exitButton.waitForDisplayed({ reverse: true });
  };
}

export default new StakingExitModalAssert();
