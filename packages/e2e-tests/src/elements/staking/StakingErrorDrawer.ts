class StakingErrorDrawer {
  private ICON = '[data-testid="result-message-img"]';
  private TITLE = '[data-testid="result-message-title"]';
  private DESCRIPTION = '[data-testid="result-message-description"]';
  private RETRY_BUTTON = '[data-testid="staking-fail-retry-button"]';
  private CLOSE_BUTTON = '[data-testid="staking-fail-close-button"]';

  get icon() {
    return $(this.ICON);
  }

  get title() {
    return $(this.TITLE);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get retryButton() {
    return $(this.RETRY_BUTTON);
  }

  get closeButton() {
    return $(this.CLOSE_BUTTON);
  }
}

export default new StakingErrorDrawer();
