/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';

class ShareWalletDetailsScreen extends AddSharedWalletCommonModalElements {
  private DOWNLOAD_BUTTON = '[data-testid="download-json-btn"]';
  private DOWNLOAD_NOTICE = '[data-testid="download-notice"]';
  private CONFIG_FILE_LABEL = '[data-testid="shared-wallet-setup-file-title"]';
  private CONFIG_FILE_PATH = '[data-testid="shared-wallet-setup-file-description"]';

  get downloadNotice(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DOWNLOAD_NOTICE);
  }

  get downloadButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DOWNLOAD_BUTTON);
  }

  get configFileLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIG_FILE_LABEL);
  }

  get configFilePath(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIG_FILE_PATH);
  }

  get openSharedWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.nextButton;
  }

  async clickOnDownloadButton() {
    await this.downloadButton.waitForClickable();
    await this.downloadButton.click();
  }

  async clickOnOpenSharedWalletButton() {
    await this.openSharedWalletButton.waitForClickable();
    await this.openSharedWalletButton.click();
  }
}

export default new ShareWalletDetailsScreen();
