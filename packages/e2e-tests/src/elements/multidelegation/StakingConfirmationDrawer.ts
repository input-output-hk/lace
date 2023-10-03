class StakingConfirmationDrawer {
  // TODO: add remaining elements
  private NEXT_BUTTON = '[data-testid="stake-pool-confirmation-btn"]';

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }
}

export default new StakingConfirmationDrawer();
