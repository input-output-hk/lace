import GeneralSettingsDrawer from '../../elements/settings/extendedView/generalSettingsDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class DrawerGeneralSettingsAssert {
  async assertSeeShowPublicKeyButton() {
    await GeneralSettingsDrawer.showPublicKeyButton.waitForDisplayed();
    expect(await GeneralSettingsDrawer.showPublicKeyButton.getText()).to.equal(
      await t('browserView.settings.wallet.general.showPubKeyAction')
    );
  }
}

export default new DrawerGeneralSettingsAssert();
