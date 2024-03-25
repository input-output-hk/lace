/* eslint-disable no-undef */
import CommonDrawerElements from './CommonDrawerElements';

class WalletAddressPage extends CommonDrawerElements {
  private ADDRESS_CARD = '[data-testid="address-card"]';
  private QR_CODE = '[data-testid="qr-code"]';
  private WALLET_NAME = '[data-testid="address-card-name"]';
  private WALLET_ADDRESS = '[data-testid="address-card-address"]';
  private COPY_BUTTON = '[data-testid="copy-address-btn"]';
  public HANDLE_NAME = '[data-testid="address-card-handle-name"]';
  public HANDLE_IMAGE = '[data-testid="address-card-handle-image"]';
  public HANDLE_SYMBOL = '[data-testid="address-card-handle-symbol"]';

  get addressCard() {
    return $(this.ADDRESS_CARD);
  }

  get handleNames() {
    return $$(this.HANDLE_NAME);
  }

  get handleImages() {
    return $$(this.HANDLE_IMAGE);
  }

  get addressCards() {
    return $$(this.ADDRESS_CARD);
  }

  get qrCode() {
    return $(this.QR_CODE);
  }

  get walletName() {
    return $(this.WALLET_NAME);
  }

  get walletAddress() {
    return $(this.WALLET_ADDRESS);
  }

  get copyButton() {
    return $(this.COPY_BUTTON);
  }

  async getHandleAddressCard(handleName: string): Promise<WebdriverIO.Element> {
    if ((await this.handleNames.length) > 0) {
      return (await this.addressCards.find(
        async (item) => (await item.$(this.HANDLE_NAME).getText()) === handleName
      )) as WebdriverIO.Element;
    }
    return undefined as unknown as WebdriverIO.Element;
  }

  async clickCopyButtonForHandle(handleName: string) {
    const addressCard = await this.getHandleAddressCard(handleName);
    await addressCard.waitForStable();
    await addressCard.scrollIntoView();
    await addressCard.moveTo();
    await addressCard.$(this.COPY_BUTTON).click();
  }
}

export default new WalletAddressPage();
