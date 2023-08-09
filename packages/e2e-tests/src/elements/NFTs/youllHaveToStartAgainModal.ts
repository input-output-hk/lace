/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class YoullHaveToStartAgainModal {
  private CONTAINER = '.ant-modal-content';
  private TITLE = '[data-testid="create-folder-modal-title"]';
  private DESCRIPTION = '[data-testid="create-folder-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="create-folder-modal-cancel"]';
  private AGREE_BUTTON = '[data-testid="create-folder-modal-confirm"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get agreeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AGREE_BUTTON);
  }
}

export default new YoullHaveToStartAgainModal();
