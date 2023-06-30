import CommonDrawerElements from '../CommonDrawerElements';
import NftFolderNameInput from './nftFolderNameInput';

class NftCreateFolderPage extends CommonDrawerElements {
  private NEXT_BUTTON = '[data-testid="create-folder-drawer-form-cta"]';

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get folderNameInput(): typeof NftFolderNameInput {
    return NftFolderNameInput;
  }
}

export default new NftCreateFolderPage();
