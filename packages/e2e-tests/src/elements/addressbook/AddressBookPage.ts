/* eslint-disable no-undef */
class AddressBookPage {
  private TITLE = '[data-testid="page-title"]';
  private COUNTER = '[data-testid="counter"]';
  private ADD_ADDRESS_BUTTON = '[data-testid="add-address-button"]';
  private ADDRESS_BOOK_EMPTY_STATE_IMAGE = '[data-testid="address-book-empty-state-image"]';
  private ADDRESS_BOOK_EMPTY_STATE_TITLE = '[data-testid="address-book-empty-state-title"]';
  private ADDRESS_BOOK_EMPTY_STATE_MESSAGE = '[data-testid="address-book-empty-state-message"]';
  private ADDRESS_LIST = '[data-testid="address-list"]';
  private ADDRESS_LIST_HEADER = '[data-testid="address-list-header"]';
  private ADDRESS_LIST_ITEM = '[data-testid="address-list-item"]';
  public ADDRESS_LIST_ITEM_AVATAR = '[data-testid="address-list-item-avatar"]';
  public ADDRESS_LIST_ITEM_NAME = '[data-testid="address-list-item-name"]';
  public ADDRESS_LIST_ITEM_ADDRESS = '[data-testid="address-list-item-address"]';

  get pageTitle() {
    return $(this.TITLE);
  }

  get addressCounter() {
    return $(this.COUNTER);
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

  getAddressListRows() {
    return this.addressList.$$(this.ADDRESS_LIST_ITEM);
  }

  get addressListHeader() {
    return $(this.ADDRESS_LIST_HEADER);
  }

  async getCounterValue(): Promise<string> {
    const counterText = await this.addressCounter.getText();
    return counterText.slice(1, -1);
  }

  async clickAddAddressButton() {
    await this.addAddressButton.waitForClickable();
    await this.addAddressButton.click();
  }

  async getAddressRowByName(name: string) {
    return (await this.getAddressListRows().find(
      async (row) => (await row.$(this.ADDRESS_LIST_ITEM_NAME).getText()) === name
    )) as WebdriverIO.Element;
  }
}

export default new AddressBookPage();
