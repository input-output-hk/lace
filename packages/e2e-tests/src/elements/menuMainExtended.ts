/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class MenuMainExtended {
  private CONTAINER = '//ul[@data-testid="side-menu"]';
  private TOKENS_BUTTON = '//li[@data-testid="item-assets"]';
  private NFTS_BUTTON = '//li[@data-testid="item-nfts"]';
  private TRANSACTIONS_BUTTON = '//li[@data-testid="item-transactions"]';
  private STAKING_BUTTON = '//li[@data-testid="item-staking"]';
  private DAPPS_BUTTON = '//li[@data-testid="item-dapps"]';
  private VOTING_BUTTON = '//li[@data-testid="item-voting"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}`);
  }

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

  get dappsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.DAPPS_BUTTON}`);
  }

  get votingButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.VOTING_BUTTON}`);
  }

  getIcon(menuItem: ChainablePromiseElement<WebdriverIO.Element>): ChainablePromiseElement<WebdriverIO.Element> {
    return menuItem.$('//*[name()="svg"]');
  }

  async hoverOverMenu(): Promise<void> {
    await this.container.moveTo();
  }

  async clickOnTokensButton() {
    await this.tokensButton.waitForClickable();
    await this.tokensButton.click();
  }

  async clickOnNFTsButton() {
    await this.nftsButton.waitForClickable();
    await this.nftsButton.click();
  }

  async clickOnActivityButton() {
    await this.transactionsButton.waitForClickable();
    await this.transactionsButton.click();
  }

  async clickOnStakingButton() {
    await this.stakingButton.waitForClickable();
    await this.stakingButton.click();
  }

  async clickOnDAppsButton() {
    await this.dappsButton.waitForClickable();
    await this.dappsButton.click();
  }

  async clickOnVotingButton() {
    await this.votingButton.waitForClickable();
    await this.votingButton.click();
  }
}

export default new MenuMainExtended();
