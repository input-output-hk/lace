class NftFolderNameInput {
  private INPUT = '[data-testid="folder-name-input"]';
  private INPUT_LABEL = '[data-testid="input-label"]';
  private INPUT_ERROR = '[data-testid="folder-name-input-error"]';

  get input() {
    return $(this.INPUT);
  }

  get inputLabel() {
    return $(this.INPUT_LABEL);
  }

  get inputError() {
    return $(this.INPUT_ERROR);
  }
}

export default new NftFolderNameInput();
