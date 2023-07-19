class DeleteAddressModal {
  private CONTAINER = '.ant-modal-content';
  private TITLE = '[data-testid="delete-address-modal-title"]';
  private DESCRIPTION = '[data-testid="delete-address-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="delete-address-modal-cancel"]';
  private DELETE_ADDRESS_BUTTON = '[data-testid="delete-address-modal-confirm"]';

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

  get deleteAddressButton() {
    return $(this.DELETE_ADDRESS_BUTTON);
  }
}

export default new DeleteAddressModal();
