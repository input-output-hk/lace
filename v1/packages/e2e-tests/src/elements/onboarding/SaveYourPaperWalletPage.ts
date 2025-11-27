/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class SaveYourPaperWalletPage {
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
  private DOWNLOAD_OR_SAVE_LABEL = '[data-testid="paper-wallet-save-or-print-label"]';
  private OPEN_WALLET_BUTTON = '[data-testid="open-wallet-button"]';

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

  get downloadOrSaveLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DOWNLOAD_OR_SAVE_LABEL);
  }

  get openWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OPEN_WALLET_BUTTON);
  }

  async clickOnButton(button: 'Download' | 'Print' | 'Open wallet'): Promise<void> {
    switch (button) {
      case 'Download':
        await this.downloadButton.waitForClickable();
        await this.downloadButton.click();
        break;
      case 'Print':
        await this.printButton.waitForClickable();
        await this.printButton.click();
        break;
      case 'Open wallet':
        await this.openWalletButton.waitForClickable();
        await this.openWalletButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
}

export default new SaveYourPaperWalletPage();
