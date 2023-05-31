import { DrawerCommonExtended } from '../../drawerCommonExtended';
import { WebElement } from '../../webElement';

class GeneralSettingsDrawer extends WebElement {
  baseDrawer: DrawerCommonExtended;
  private SHOW_PUBLIC_KEY_BUTTON = '//button[@data-testid="show-public-key-button"]';
  constructor() {
    super();
    this.baseDrawer = new DrawerCommonExtended();
  }
  get showPublicKeyButton() {
    return $(this.SHOW_PUBLIC_KEY_BUTTON);
  }
}

export default new GeneralSettingsDrawer();
