/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class StakingExitModal {
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private CANCEL_BUTTON = '[data-testid="exit-staking-modal-cancel"]';
  private EXIT_BUTTON = '[data-testid="exit-staking-modal-confirm"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  get exitButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EXIT_BUTTON);
  }
}

export default new StakingExitModal();
