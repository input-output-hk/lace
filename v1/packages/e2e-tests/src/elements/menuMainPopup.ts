/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class MenuMainPopup {
  private CONTAINER = '//div[@data-testid="main-menu-container"]';
  private TOKENS_BUTTON = '//button[@data-testid="main-footer-assets"]';
  private NFTS_BUTTON = '//button[@data-testid="main-footer-nfts"]';
  private TRANSACTIONS_BUTTON = '//button[@data-testid="main-footer-activity"]';
  private STAKING_BUTTON = '//button[@data-testid="main-footer-staking"]';
  private DAPPS_BUTTON = '//button[@data-testid="main-footer-dapp-explorer"]';
  private VOTING_BUTTON = '//button[@data-testid="main-footer-voting"]';

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

export default new MenuMainPopup();
