import CommonDrawerElements from '../CommonDrawerElements';
import NftFolderNameInput from './nftFolderNameInput';

class NftRenameFolderPage extends CommonDrawerElements {
  private CONFIRM_BUTTON = '[data-testid="rename-folder-drawer-form-confirm-button"]';
  private CANCEL_BUTTON = '[data-testid="rename-folder-drawer-form-cancel-button"]';

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton() {
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
