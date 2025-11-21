/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';
import path from 'node:path';

class LetsFindYourSharedWalletScreen extends AddSharedWalletCommonModalElements {
  private UPLOAD_COMPONENT = '#upload-json-label';
  private UPLOAD_INPUT = '#upload-json';
  private UPLOAD_FILE_LABEL = '[data-testid="file-upload-label"]';
  private SUPPORTED_FORMATS_LABEL = '[data-testid="supported-formats-label"]';

  get uploadComponent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.UPLOAD_COMPONENT);
  }

  get uploadInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.UPLOAD_INPUT);
  }

  get uploadFileLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.UPLOAD_FILE_LABEL);
  }

  get supportedFormatsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUPPORTED_FORMATS_LABEL);
  }

  get openWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.nextButton;
  }

  async uploadSharedWalletJSON(useValidConfig: boolean): Promise<void> {
    const filename = useValidConfig ? 'valid-shared-wallet-config.json' : 'invalid-shared-wallet-config.json';
    // input component needs to be visible to avoid an error with .setValue(...) method
    await browser.executeScript(`document.querySelector("${this.UPLOAD_INPUT}").removeAttribute("hidden");`, []);
    await this.uploadInput.waitForDisplayed();
    const filePath = path.join(import.meta.dirname, '../../data/', filename);
    const remoteFilePath = await browser.uploadFile(filePath);
    await this.uploadInput.setValue(remoteFilePath);
  }

  async clickOnOpenWalletButton(): Promise<void> {
    await this.openWalletButton.waitForClickable();
    await this.openWalletButton.click();
  }
}

export default new LetsFindYourSharedWalletScreen();
