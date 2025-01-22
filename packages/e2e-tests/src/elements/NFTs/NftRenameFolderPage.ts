/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import NftFolderNameInput from './nftFolderNameInput';
import { ChainablePromiseElement } from 'webdriverio';

class NftRenameFolderPage extends CommonDrawerElements {
  private CONFIRM_BUTTON = '[data-testid="rename-folder-drawer-form-confirm-button"]';
  private CANCEL_BUTTON = '[data-testid="rename-folder-drawer-form-cancel-button"]';

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get folderNameInput(): typeof NftFolderNameInput {
    return NftFolderNameInput;
  }

  async clickCancelButton() {
    await this.cancelButton.waitForClickable();
    await this.cancelButton.click();
  }

  async clickConfirmButton() {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }
}

export default new NftRenameFolderPage();
