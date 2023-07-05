import CommonDrawerElements from '../CommonDrawerElements';
import NftFolderNameInput from './nftFolderNameInput';
import { clearInputFieldValue } from '../../utils/inputFieldUtils';

class NftCreateFolderPage extends CommonDrawerElements {
  private NEXT_BUTTON = '[data-testid="create-folder-drawer-form-cta"]';

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get folderNameInput(): typeof NftFolderNameInput {
    return NftFolderNameInput;
  }

  async setFolderNameInput(value: string): Promise<void> {
    await clearInputFieldValue(await this.folderNameInput.input);
    (await this.folderNameInput.input).setValue(value);
  }
}

export default new NftCreateFolderPage();
