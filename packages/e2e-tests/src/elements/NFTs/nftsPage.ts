/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import { ChainablePromiseElement } from 'webdriverio';

class NftsPage {
  private CREATE_FOLDER_BUTTON = '[data-testid="create-folder-button"]';

  get title() {
    return SectionTitle.sectionTitle;
  }

  get counter() {
    return SectionTitle.sectionCounter;
  }

  get createFolderButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CREATE_FOLDER_BUTTON);
  }
}

export default new NftsPage();
