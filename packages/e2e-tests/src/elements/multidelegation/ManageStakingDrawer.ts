class ManageStakingDrawer {
  // TODO: add remaining elements
  private NEXT_BUTTON = '[data-testid="preferences-next-button"]';

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }
}

export default new ManageStakingDrawer();
