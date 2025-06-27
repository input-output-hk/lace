/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';
import type { ChainablePromiseArray } from 'webdriverio/build/types';

class PassphraseDrawer extends CommonDrawerElements {
  private BANNER_ICON = '[data-testid="banner-icon"]';
  private PASSPHRASE_DRAWER_DESCRIPTION = '[data-testid="passphrase-drawer-description"]';
  private BANNER_DESCRIPTION = '[data-testid="banner-description"]';
  private PASSWORD_INPUT_CONTAINER = '[data-testid="password-input-container"]';
  private SHOW_PASSPHRASE_BUTTON = '[data-testid="show-passphrase-button"]';
  private HIDE_PASSPHRASE_BUTTON = '[data-testid="hide-passphrase-button"]';
  private MNEMONIC_WORD_CONTAINER = '[data-testid="mnemonic-word-container"]';
  private MNEMONIC_WORD_WRITEDOWN = '[data-testid="mnemonic-word-writedown"]';

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSPHRASE_DRAWER_DESCRIPTION);
  }

  get bannerIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_ICON);
  }

  get bannerDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER_DESCRIPTION);
  }

  get passwordInputContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT_CONTAINER);
  }

  get showPassphraseButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHOW_PASSPHRASE_BUTTON);
  }

  get hidePassphraseButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HIDE_PASSPHRASE_BUTTON);
  }

  get mnemonicWordContainers(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_WORD_CONTAINER);
  }

  get mnemonicWordWritedowns(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_WORD_WRITEDOWN);
  }
}

export default new PassphraseDrawer();
