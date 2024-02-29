/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class GovernanceActionAllDonePage {
  private IMAGE = '[data-testid="dapp-sign-tx-success-image"]';
  private HEADING = '[data-testid="dapp-sign-tx-success-heading"]';
  private DESCRIPTION = '[data-testid="dapp-sign-tx-success-description"]';
  private CLOSE_BUTTON = '[data-testid="dapp-sign-tx-success-close-button"]';

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE);
  }

  get heading(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADING);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }
}

export default new GovernanceActionAllDonePage();
