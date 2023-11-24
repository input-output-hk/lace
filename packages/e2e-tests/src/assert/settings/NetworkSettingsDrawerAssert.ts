import NetworkDrawer from '../../elements/settings/NetworkDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class NetworkSettingsDrawerAssert {
  async assertSeeNetworkRadioButtons() {
    await NetworkDrawer.preprodRadioButton.waitForDisplayed();
    expect(await NetworkDrawer.preprodRadioButton.getText()).to.equal(await t('general.networks.preprod'));
    await NetworkDrawer.previewRadioButton.waitForDisplayed();
    expect(await NetworkDrawer.previewRadioButton.getText()).to.equal(await t('general.networks.preview'));
    await NetworkDrawer.mainnetRadioButton.waitForDisplayed();
    expect(await NetworkDrawer.mainnetRadioButton.getText()).to.equal(await t('general.networks.mainnet'));
  }
}

export default new NetworkSettingsDrawerAssert();
