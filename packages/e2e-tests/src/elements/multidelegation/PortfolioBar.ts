class PortfolioBar {
  private CONTAINER = '[data-testid="portfoliobar-container"]';
  private SELECTED_POOLS_COUNTER = '[data-testid="portfoliobar-selected-pools"]';
  private MAX_POOLS_COUNTER = '[data-testid="portfoliobar-max-pools"]';
  private NEXT_BUTTON = '[data-testid="portfoliobar-btn-next"]';
  private CLEAR_BUTTON = '[data-testid="portfoliobar-btn-clear"]';

  get container() {
    return $(this.CONTAINER);
  }

  get selectedPoolsCounter() {
    return $(this.SELECTED_POOLS_COUNTER);
  }

  get maxPoolsCounter() {
    return $(this.MAX_POOLS_COUNTER);
  }

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get clearButton() {
    return $(this.CLEAR_BUTTON);
  }

  async clickNextButton() {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }

  async clickClearButton() {
    await this.clearButton.waitForClickable();
    await this.clearButton.click();
  }
}

export default new PortfolioBar();
