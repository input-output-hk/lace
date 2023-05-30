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
}

export default new MenuMainPopup();
