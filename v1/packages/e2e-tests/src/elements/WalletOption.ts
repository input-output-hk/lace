/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class WalletOption {
  protected CONTAINER_SELECTOR;
  private ITEM = '//button[@data-testid="wallet-option-item"]';
  private ICON = '//div[@data-testid="wallet-option-icon"]';
  private TITLE = '//span[@data-testid="wallet-option-title"]';
  private SUBTITLE = '//span[@data-testid="wallet-option-subtitle"]';
  private ACCOUNTS_MENU_BUTTON = '//div[@data-testid="wallet-option-accounts-menu-button"]';
  private EDIT_BUTTON = '//div[@data-testid="wallet-option-edit-wallet-button"]';
  private STATUS = '//p[@data-testid="header-wallet-status"]';

  constructor(index = 1) {
    this.CONTAINER_SELECTOR = `(${this.ITEM})[${index}]`;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER_SELECTOR);
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.ICON}`);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.TITLE}`);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.SUBTITLE}`);
  }

  get accountsMenuButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.ACCOUNTS_MENU_BUTTON}`);
  }

  get editButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.EDIT_BUTTON}`);
  }

  get status(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER_SELECTOR}${this.STATUS}`);
  }

  async clickOnWalletOptionContainer(): Promise<void> {
    await this.container.scrollIntoView();
    await this.container.click();
  }

  async clickOnAccountsMenuButton(): Promise<void> {
    await this.accountsMenuButton.waitForClickable();
    await this.accountsMenuButton.scrollIntoView();
    await this.accountsMenuButton.click();
  }

  async clickOnEditButton(): Promise<void> {
    await this.editButton.waitForClickable();
    await this.editButton.click();
  }
}

export default WalletOption;
