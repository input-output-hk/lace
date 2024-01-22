import { expect } from 'chai';
import { t } from '../../utils/translationService';
import ChangingStakingPreferencesModal from '../../elements/multidelegation/ChangingStakingPreferencesModal';

class ChangingStakingPreferencesModalAssert {
  assertSeeModal = async () => {
    await ChangingStakingPreferencesModal.container.waitForDisplayed();
    await ChangingStakingPreferencesModal.title.waitForDisplayed();
    expect(await ChangingStakingPreferencesModal.title.getText()).to.equal(
      await t('modals.changingPreferences.title', 'staking')
    );
    await ChangingStakingPreferencesModal.description.waitForDisplayed();
    expect(await ChangingStakingPreferencesModal.description.getText()).to.equal(
      await t('modals.changingPreferences.description', 'staking')
    );
    await ChangingStakingPreferencesModal.cancelButton.waitForClickable();
    expect(await ChangingStakingPreferencesModal.cancelButton.getText()).to.equal(
      await t('modals.changingPreferences.buttons.cancel', 'staking')
    );
    await ChangingStakingPreferencesModal.fineByMeButton.waitForClickable();
    expect(await ChangingStakingPreferencesModal.fineByMeButton.getText()).to.equal(
      await t('modals.changingPreferences.buttons.confirm', 'staking')
    );
  };
}

export default new ChangingStakingPreferencesModalAssert();
