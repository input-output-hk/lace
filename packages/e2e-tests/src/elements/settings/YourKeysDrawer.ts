import CommonDrawerElements from '../CommonDrawerElements';

class YourKeysDrawer extends CommonDrawerElements {
  private SHOW_PUBLIC_KEY_BUTTON = '[data-testid="show-public-key-button"]';

  get showPublicKeyButton() {
    return $(this.SHOW_PUBLIC_KEY_BUTTON);
  }
}

export default new YourKeysDrawer();
