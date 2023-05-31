/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class MenuMainExtended {
  private CONTAINER = '//ul[@data-testid="side-menu"]';
  private TOKENS_BUTTON = '//li[@data-testid="item-assets"]';
  private NFTS_BUTTON = '//li[@data-testid="item-nfts"]';
  private TRANSACTIONS_BUTTON = '//li[@data-testid="item-transactions"]';
  private STAKING_BUTTON = '//li[@data-testid="item-staking"]';

  get tokensButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TOKENS_BUTTON}`);
  }

  get nftsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.NFTS_BUTTON}`);
  }

  get transactionsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.TRANSACTIONS_BUTTON}`);
  }

  get stakingButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.STAKING_BUTTON}`);
  }

  getIcon(menuItem: ChainablePromiseElement<WebdriverIO.Element>): ChainablePromiseElement<WebdriverIO.Element> {
    return menuItem.$('//*[name()="svg"]');
  }
}

export default new MenuMainExtended();
