/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class WalletAccountsMenuItem {
  protected CONTAINER_SELECTOR;
  private ITEM = '//div[@data-testid="wallet-account-item"]';
  private ICON = '//span[@data-testid="avatar-root"]';
  private LABEL = '//span[@data-testid="wallet-account-item-label"]';
  private PATH = '//span[@data-testid="wallet-account-item-path"]';
  private DISABLE_BUTTON = '//button[@data-testid="wallet-account-item-lock-btn"]';
  private ENABLE_BUTTON = '//button[@data-testid="wallet-account-item-unlock-btn"]';

  constructor(index = 1) {
    this.CONTAINER_SELECTOR = `(${this.ITEM})[${index}]`;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER_SELECTOR);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.ICON}`);
  }

  get label(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.LABEL}`);
  }

  get path(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.PATH}`);
  }

  get accountDisableButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.DISABLE_BUTTON}`);
  }

  get accountEnableButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.ENABLE_BUTTON}`);
  }
}

export default WalletAccountsMenuItem;
