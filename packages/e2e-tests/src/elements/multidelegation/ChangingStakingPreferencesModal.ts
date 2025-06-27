/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class ChangingStakingPreferencesModal {
  private CONTAINER = '.ant-modal-body';
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="switch-pools-modal-cancel"]';
  private FINE_BY_ME_BUTTON = '[data-testid="switch-pools-modal-confirm"]';

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

  get fineByMeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.FINE_BY_ME_BUTTON);
  }
}

export default new ChangingStakingPreferencesModal();
