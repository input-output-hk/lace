/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class PinWalletExtensionNotification {
  private COMPONENT = '[data-testid="pin-extension-component"]';
  private LOGO = '[data-testid="pin-extension-logo"]';
  private TITLE = '[data-testid="pin-extension-title"]';
  private PROMPT = '[data-testid="pin-extension-prompt"]';
  private ICON = '[data-testid="pin-extension-icon"]';

  get component(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COMPONENT);
  }

  get logo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOGO);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get prompt(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PROMPT);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ICON);
  }
}

export default new PinWalletExtensionNotification();
