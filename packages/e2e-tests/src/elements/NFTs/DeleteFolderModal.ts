class DeleteFolderModal {
  private CONTAINER = '.ant-modal-content';
  private TITLE = '[data-testid="create-folder-modal-title"]';
  private DESCRIPTION = '[data-testid="create-folder-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-folder-modal-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="delete-folder-modal-confirm"]';

  get container() {
    return $(this.CONTAINER);
  }

  get title() {
    return $(this.TITLE);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickConfirmButton() {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }
}

export default new DeleteFolderModal();
