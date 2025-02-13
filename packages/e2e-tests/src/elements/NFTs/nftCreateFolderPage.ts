/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import NftFolderNameInput from './nftFolderNameInput';
import { clearInputFieldValue } from '../../utils/inputFieldUtils';
import { ChainablePromiseElement } from 'webdriverio';

class NftCreateFolderPage extends CommonDrawerElements {
  private NEXT_BUTTON = '[data-testid="create-folder-drawer-form-cta"]';

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  get folderNameInput(): typeof NftFolderNameInput {
    return NftFolderNameInput;
  }

  async setFolderNameInput(value: string): Promise<void> {
    await this.folderNameInput.input.waitForClickable();
    await this.folderNameInput.input.setValue(value);
  }

  async clearFolderNameInput(): Promise<void> {
    await this.folderNameInput.input.waitForClickable();
    await clearInputFieldValue(await this.folderNameInput.input);
  }

  async clickNextButton() {
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
  }
}

export default new NftCreateFolderPage();
