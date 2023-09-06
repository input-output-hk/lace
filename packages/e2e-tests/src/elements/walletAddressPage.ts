import CommonDrawerElements from './CommonDrawerElements';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class WalletAddressPage extends CommonDrawerElements {
  private ADDRESS_CARD = '[data-testid="address-card"]';
  private QR_CODE = '[data-testid="qr-code"]';
  private WALLET_NAME = '[data-testid="address-card-name"]';
  private WALLET_ADDRESS = '[data-testid="address-card-address"]';
  private COPY_BUTTON = '[data-testid="copy-address-btn"]';
  private ADDRESS_CARD_HANDLE_NAME = '[data-testid="address-card-handle-name"]';
  private ADDRESS_CARD_HANDLE_IMAGE = '[data-testid="address-card-handle-image"]';

  get addressCard() {
    return $(this.ADDRESS_CARD);
  }

  get addressCardHandleName() {
    return $$(this.ADDRESS_CARD_HANDLE_NAME);
  }

  // eslint-disable-next-line no-undef
  get addressCardHandleImage(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.ADDRESS_CARD_HANDLE_IMAGE);
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
