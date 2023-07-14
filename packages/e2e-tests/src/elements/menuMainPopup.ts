class MenuMainPopup {
  private CONTAINER = '//div[@data-testid="main-menu-container"]';
  private TOKENS_BUTTON = '//button[@data-testid="main-footer-assets"]';
  private NFTS_BUTTON = '//button[@data-testid="main-footer-nfts"]';
  private TRANSACTIONS_BUTTON = '//button[@data-testid="main-footer-activity"]';
  private STAKING_BUTTON = '//button[@data-testid="main-footer-staking"]';

  get tokensButton() {
    return $(`${this.CONTAINER}${this.TOKENS_BUTTON}`);
  }

  get nftsButton() {
    return $(`${this.CONTAINER}${this.NFTS_BUTTON}`);
  }

  get transactionsButton() {
    return $(`${this.CONTAINER}${this.TRANSACTIONS_BUTTON}`);
  }

  get stakingButton() {
    return $(`${this.CONTAINER}${this.STAKING_BUTTON}`);
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
}

export default new MenuMainPopup();
