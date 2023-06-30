class AddressBookPage {
  private TITLE_SELECTOR = '[data-testid="page-title"]';
  private COUNTER_SELECTOR = '[data-testid="counter"]';
  private ADD_ADDRESS_BUTTON = '[data-testid="add-address-button"]';
  private ADDRESS_BOOK_EMPTY_STATE_IMAGE = '[data-testid="address-book-empty-state-image"]';
  private ADDRESS_BOOK_EMPTY_STATE_TITLE = '[data-testid="address-book-empty-state-title"]';
  private ADDRESS_BOOK_EMPTY_STATE_MESSAGE = '[data-testid="address-book-empty-state-message"]';
  private ADDRESS_LIST = '[data-testid="address-list"]';
  private ADDRESS_LIST_HEADER = '[data-testid="address-list-header"]';

  get titleElement() {
    return $(this.TITLE_SELECTOR);
  }

  get counterElement() {
    return $(this.COUNTER_SELECTOR);
  }

  get addAddressButton() {
    return $(this.ADD_ADDRESS_BUTTON);
  }

  get emptyStateImage() {
    return $(this.ADDRESS_BOOK_EMPTY_STATE_IMAGE);
  }

  get emptyStateTitle() {
    return $(this.ADDRESS_BOOK_EMPTY_STATE_TITLE);
  }

  get emptyStateMessage() {
    return $(this.ADDRESS_BOOK_EMPTY_STATE_MESSAGE);
  }

  get addressList() {
    return $(this.ADDRESS_LIST);
  }

  get addressListHeader() {
    return $(this.ADDRESS_LIST_HEADER);
  }

  async getCounterValue(): Promise<string> {
    const counterText = await this.counterElement.getText();
    return counterText.slice(1, -1);
  }

  async clickAddAddressButton() {
    await this.addAddressButton.waitForClickable();
    await this.addAddressButton.click();
  }
}

export default new AddressBookPage();
