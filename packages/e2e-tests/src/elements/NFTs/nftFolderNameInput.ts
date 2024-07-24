/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class NftFolderNameInput {
  private INPUT = '[data-testid="folder-name-input"]';
  private INPUT_LABEL = '[data-testid="input-label"]';
  private INPUT_ERROR = '[data-testid="folder-name-input-error"]';

  get input(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INPUT);
  }

  get inputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INPUT_LABEL);
  }

  get inputError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INPUT_ERROR);
  }
}

export default new NftFolderNameInput();
