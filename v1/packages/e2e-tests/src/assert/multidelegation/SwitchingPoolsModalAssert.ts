import { expect } from 'chai';
import { t } from '../../utils/translationService';
import SwitchingStakePoolModal from '../../elements/multidelegation/SwitchingStakePoolModal';

class SwitchingPoolsModalAssert {
  async assertSeeSwitchingToLessPoolsModal() {
    await SwitchingStakePoolModal.title.waitForDisplayed();
    expect(await SwitchingStakePoolModal.title.getText()).to.equal(await t('modals.poolsManagement.title'));
    await SwitchingStakePoolModal.description.waitForDisplayed();
    expect(await SwitchingStakePoolModal.description.getText()).to.equal(
      await t('modals.poolsManagement.description.reduction')
    );
    await SwitchingStakePoolModal.fineByMeButton.waitForDisplayed();
    expect(await SwitchingStakePoolModal.fineByMeButton.getText()).to.equal(
      await t('modals.poolsManagement.buttons.confirm')
    );
    await SwitchingStakePoolModal.cancelButton.waitForDisplayed();
    expect(await SwitchingStakePoolModal.cancelButton.getText()).to.equal(
      await t('modals.poolsManagement.buttons.cancel')
    );
  }
}

export default new SwitchingPoolsModalAssert();
