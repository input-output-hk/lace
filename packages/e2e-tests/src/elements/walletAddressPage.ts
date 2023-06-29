import CommonDrawerElements from './CommonDrawerElements';

class WalletAddressPage extends CommonDrawerElements {
  private ADDRESS_CARD = '[data-testid="address-card"]';
  private QR_CODE = '[data-testid="qr-code"]';
  private WALLET_NAME = '[data-testid="address-card-name"]';
  private WALLET_ADDRESS = '[data-testid="address-card-address"]';
  private COPY_BUTTON = '[data-testid="copy-address-btn"]';

  get addressCard() {
    return $(this.ADDRESS_CARD);
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
}

export default new WalletAddressPage();
