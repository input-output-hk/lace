/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class YoullHaveToStartAgainModal {
  private CONTAINER = '.ant-modal-content';
  private TITLE = '[data-testid="create-foler-modal-title"]';
  private DESCRIPTION = '[data-testid="create-foler-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="create-foler-modal-cancel"]';
  private AGREE_BUTTON = '[data-testid="create-foler-modal-confirm"]';

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
