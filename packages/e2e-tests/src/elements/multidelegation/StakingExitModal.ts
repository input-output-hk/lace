class StakingExitModal {
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="exit-staking-modal-cancel"]';
  private EXIT_BUTTON = '[data-testid="exit-staking-modal-confirm"]';

  get title() {
    return $(this.TITLE);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  get exitButton() {
    return $(this.EXIT_BUTTON);
  }
}

export default new StakingExitModal();
