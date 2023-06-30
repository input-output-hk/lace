import NetworkDrawer from '../../elements/settings/NetworkDrawer';

class NetworkSettingsDrawerAssert {
  async assertSeeNetworkRadioButtons() {
    await NetworkDrawer.preprodRadioButton.waitForDisplayed();
    await NetworkDrawer.previewRadioButton.waitForDisplayed();
  }
}

export default new NetworkSettingsDrawerAssert();
