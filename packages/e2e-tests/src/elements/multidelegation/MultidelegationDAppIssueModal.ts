/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class MultidelegationDAppIssueModal {
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private GOT_IT_BUTTON = '[data-testid="multidelegation-dapp-modal-button"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get gotItButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GOT_IT_BUTTON);
  }
}

export default new MultidelegationDAppIssueModal();
