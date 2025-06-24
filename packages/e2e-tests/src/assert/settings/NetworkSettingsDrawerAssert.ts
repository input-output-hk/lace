import NetworkDrawer from '../../elements/settings/NetworkDrawer';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { browser } from '@wdio/globals';

class NetworkSettingsDrawerAssert {
  async assertSeeNetworkRadioButtons() {
    await NetworkDrawer.preprodRadioButtonLabel.waitForDisplayed();

    await browser.waitUntil(async () => (await NetworkDrawer.preprodRadioButtonLabel.getText()) !== '', {
      timeout: 2000,
      timeoutMsg: 'radio button text should not be empty'
    });

    expect(await NetworkDrawer.preprodRadioButtonLabel.getText()).to.equal(await t('general.networks.preprod'));
    await NetworkDrawer.previewRadioButtonLabel.waitForDisplayed();
    expect(await NetworkDrawer.previewRadioButtonLabel.getText()).to.equal(await t('general.networks.preview'));
    await NetworkDrawer.mainnetRadioButtonLabel.waitForDisplayed();
    expect(await NetworkDrawer.mainnetRadioButtonLabel.getText()).to.equal(await t('general.networks.mainnet'));
  }
}

export default new NetworkSettingsDrawerAssert();
