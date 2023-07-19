import YourKeysDrawer from '../../elements/settings/YourKeysDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class YourKeysDrawerAssert {
  async assertSeeShowPublicKeyButton() {
    await YourKeysDrawer.showPublicKeyButton.waitForClickable();
    expect(await YourKeysDrawer.showPublicKeyButton.getText()).to.equal(
      await t('browserView.settings.wallet.general.showPubKeyAction')
    );
  }
}

export default new YourKeysDrawerAssert();
