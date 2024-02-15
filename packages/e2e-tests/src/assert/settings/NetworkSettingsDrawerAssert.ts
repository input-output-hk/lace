import NetworkDrawer from '../../elements/settings/NetworkDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { browser } from '@wdio/globals';

class NetworkSettingsDrawerAssert {
  async assertSeeNetworkRadioButtons() {
    await NetworkDrawer.preprodRadioButton.waitForDisplayed();

    await browser.waitUntil(async () => (await NetworkDrawer.preprodRadioButton.getText()) !== '', {
      timeout: 2000,
      timeoutMsg: 'radio button text should not be empty'
    });

    expect(await NetworkDrawer.preprodRadioButton.getText()).to.equal(await t('general.networks.preprod'));
    await NetworkDrawer.previewRadioButton.waitForDisplayed();
    expect(await NetworkDrawer.previewRadioButton.getText()).to.equal(await t('general.networks.preview'));
    await NetworkDrawer.mainnetRadioButton.waitForDisplayed();
    expect(await NetworkDrawer.mainnetRadioButton.getText()).to.equal(await t('general.networks.mainnet'));
  }
}

export default new NetworkSettingsDrawerAssert();
