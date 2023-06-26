import NetworkSettingsDrawer from '../../elements/settings/networkSettingsDrawer';

export default new (class DrawerNetworkSettingsAssert {
  async assertSeeNetworkRadioButtons() {
    await NetworkSettingsDrawer.preprodRadioButton.waitForDisplayed();
    await NetworkSettingsDrawer.previewRadioButton.waitForDisplayed();
  }
})();
