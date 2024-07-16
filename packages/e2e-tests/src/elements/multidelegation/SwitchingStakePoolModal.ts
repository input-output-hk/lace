/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class SwitchingStakePoolModal {
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="switch-pools-modal-cancel"]';
  private FINE_BY_ME_BUTTON = '[data-testid="switch-pools-modal-confirm"]';

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

export default new SwitchingStakePoolModal();
