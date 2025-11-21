/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class WalletAccountsMenu {
  private CONTAINER = '[data-testid="user-dropdown-wallet-accounts-section"]';
  private ARROW_BUTTON = '[data-testid="navigation-button-arrow"]';
  private TITLE = '[data-testid="user-dropdown-wallet-accounts-title"]';
  private DESCRIPTION = '[data-testid="user-dropdown-wallet-accounts-description"]';
  private ACCOUNT_LIST = '[data-testid="user-dropdown-wallet-account-list"]';
  private ACCOUNT = '//ul[@data-testid="header-menu"]//div[@data-testid="wallet-account-item"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get arrowButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ARROW_BUTTON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get accountList(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACCOUNT_LIST);
  }

  get accounts(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.ACCOUNT);
  }

  async clickOnBackArrow(): Promise<void> {
    await this.arrowButton.waitForClickable();
    await this.arrowButton.click();
  }
}

export default new WalletAccountsMenu();
