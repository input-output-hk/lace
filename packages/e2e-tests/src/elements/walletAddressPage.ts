import CommonDrawerElements from './CommonDrawerElements';

class WalletAddressPage extends CommonDrawerElements {
  private QR_CODE = '[data-testid="qr-code"]';
  private WALLET_NAME = '[data-testid="info-wallet-name"]';
  private WALLET_ADDRESS = '[data-testid="info-wallet-full-address"]';
  private COPY_BUTTON = '[data-testid="copy-address-btn"]';

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
