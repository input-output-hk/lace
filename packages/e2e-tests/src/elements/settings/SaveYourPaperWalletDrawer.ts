/* eslint-disable no-undef */
import type { ChainablePromiseElement } from 'webdriverio';
import CommonDrawerElements from '../CommonDrawerElements';

class SaveYourPaperWalletDrawer extends CommonDrawerElements {
  private PAPER_WALLET_NAME = '[data-testid="paper-wallet-name"]';
  private CONTAINS_LABEL = '[data-testid="contains-label"]';
  private PRIVATE_QR_CODE_ICON = '[data-testid="private-qr-code-icon"]';
  private PRIVATE_QR_CODE_TITLE = '[data-testid="private-qr-code-title"]';
  private PRIVATE_QR_CODE_DESCRIPTION = '[data-testid="private-qr-code-description"]';
  private PUBLIC_QR_CODE_ICON = '[data-testid="public-qr-code-icon"]';
  private PUBLIC_QR_CODE_TITLE = '[data-testid="public-qr-code-title"]';
  private PUBLIC_QR_CODE_DESCRIPTION = '[data-testid="public-qr-code-description"]';
  private DOWNLOAD_BUTTON = '[data-testid="download-button"]';
  private PRINT_BUTTON = '[data-testid="print-button"]';

  get paperWalletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_NAME);
  }

  get containsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINS_LABEL);
  }

  get privateQrCodeIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRIVATE_QR_CODE_ICON);
  }

  get privateQrCodeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRIVATE_QR_CODE_TITLE);
  }

  get privateQrCodeDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRIVATE_QR_CODE_DESCRIPTION);
  }

  get publicQrCodeIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUBLIC_QR_CODE_ICON);
  }

  get publicQrCodeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUBLIC_QR_CODE_TITLE);
  }

  get publicQrCodeDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUBLIC_QR_CODE_DESCRIPTION);
  }

  get downloadButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DOWNLOAD_BUTTON);
  }

  get printButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRINT_BUTTON);
  }
}

export default new SaveYourPaperWalletDrawer();
