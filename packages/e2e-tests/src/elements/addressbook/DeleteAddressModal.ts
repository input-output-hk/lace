class DeleteAddressModal {
  private CONTAINER = '.ant-modal-wrap:not([style="display: none;"]) .ant-modal-content';
  private TITLE = '[data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private DELETE_ADDRESS_BUTTON = '[data-testid="delete-address-modal-confirm"]';

  get container() {
    return $(this.CONTAINER);
  }

  get title() {
    return this.container.$(this.TITLE);
  }

  get description() {
    return this.container.$(this.DESCRIPTION);
  }

  get cancelButton() {
    return this.container.$(this.CANCEL_BUTTON);
  }

  get deleteAddressButton() {
    return this.container.$(this.DELETE_ADDRESS_BUTTON);
  }
}

export default new DeleteAddressModal();
