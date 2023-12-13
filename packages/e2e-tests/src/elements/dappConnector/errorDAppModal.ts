class ErrorDAppModal {
  private IMAGE = '[data-testid="dapp-sign-tx-fail-image"]';
  private HEADING = '[data-testid="dapp-sign-tx-fail-heading"]';
  private DESCRIPTION = '[data-testid="dapp-sign-tx-fail-description"]';
  private CLOSE_BUTTON = '[data-testid="dapp-sign-tx-fail-close-button"]';

  get image() {
    return $(this.IMAGE);
  }

  get heading() {
    return $(this.HEADING);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get closeButton() {
    return $(this.CLOSE_BUTTON);
  }
}

export default new ErrorDAppModal();
