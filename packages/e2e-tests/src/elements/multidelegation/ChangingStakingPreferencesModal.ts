class ChangingStakingPreferencesModal {
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="switch-pools-modal-cancel"]';
  private FINE_BY_ME_BUTTON = '[data-testid="switch-pools-modal-confirm"]';

  get title() {
    return $(this.TITLE);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  get fineByMeButton() {
    return $(this.FINE_BY_ME_BUTTON);
  }
}

export default new ChangingStakingPreferencesModal();
