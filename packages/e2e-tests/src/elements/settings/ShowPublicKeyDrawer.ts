/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';

class ShowPublicKeyDrawer extends CommonDrawerElements {
  private QR_CODE = '[data-testid="qr-code"]';
  private WALLET_NAME = '[data-testid="info-wallet-name"]';
  private WALLET_ADDRESS = '[data-testid="info-wallet-full-address"]';
  private COPY_BUTTON = '[data-testid="copy-address-btn"]';

  get qrCode(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.QR_CODE);
  }

  get walletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME);
  }

  get walletAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_ADDRESS);
  }

  get copyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COPY_BUTTON);
  }
}

export default new ShowPublicKeyDrawer();
