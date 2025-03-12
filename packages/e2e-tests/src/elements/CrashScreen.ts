/* global WebdriverIO */

import { ChainablePromiseElement } from 'webdriverio';

class CrashScreen {
  private RELOAD_EXTENSION_BUTTON = '[data-testid="crash-reload"]';

  get reloadExtensionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RELOAD_EXTENSION_BUTTON);
  }
}

export default new CrashScreen();
