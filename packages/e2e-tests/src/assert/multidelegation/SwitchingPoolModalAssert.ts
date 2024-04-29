import SwitchingStakePoolModal from '../../elements/multidelegation/SwitchingStakePoolModal';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class SwitchingPoolModalAssert {
  assertSeeSwitchingPoolModal = async (shouldBeVisible: boolean) => {
    await SwitchingStakePoolModal.title.waitForDisplayed({ reverse: !shouldBeVisible });
    await SwitchingStakePoolModal.description.waitForDisplayed({ reverse: !shouldBeVisible });
    await SwitchingStakePoolModal.cancelButton.waitForDisplayed({ reverse: !shouldBeVisible });
    await SwitchingStakePoolModal.fineByMeButton.waitForDisplayed({ reverse: !shouldBeVisible });

    if (shouldBeVisible) {
      expect(await SwitchingStakePoolModal.title.getText()).to.equal(
        await t('modals.poolsManagement.title', 'staking')
      );
      expect(await SwitchingStakePoolModal.description.getText()).to.equal(
        await t('modals.poolsManagement.description.adjustment', 'staking')
      );
      expect(await SwitchingStakePoolModal.cancelButton.getText()).to.equal(
        await t('modals.poolsManagement.buttons.cancel', 'staking')
      );
      expect(await SwitchingStakePoolModal.fineByMeButton.getText()).to.equal(
        await t('modals.poolsManagement.buttons.confirm', 'staking')
      );
    }
  };
}

export default new SwitchingPoolModalAssert();
