import CommonDrawerElements from '../CommonDrawerElements';

class NetworkSettingsDrawer extends CommonDrawerElements {
  private MAINNET_RADIO_BUTTON = '//label[span/input[@data-testid="network-mainnet-radio-button"]]';
  private PREPROD_RADIO_BUTTON = '//label[span/input[@data-testid="network-preprod-radio-button"]]';
  private PREVIEW_RADIO_BUTTON = '//label[span/input[@data-testid="network-preview-radio-button"]]';

  get mainnetRadioButton() {
    return $(this.MAINNET_RADIO_BUTTON);
  }

  get preprodRadioButton() {
    return $(this.PREPROD_RADIO_BUTTON);
  }

  get previewRadioButton() {
    return $(this.PREVIEW_RADIO_BUTTON);
  }
}

export default new NetworkSettingsDrawer();
