/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class MultiDelegationBetaModal {
  private GOT_IT_BUTTON = '[data-testid="multidelegation-beta-modal-button"]';

  get gotItButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GOT_IT_BUTTON);
  }

  async clickGoItButton() {
    await this.gotItButton.waitForClickable();
    await this.gotItButton.click();
  }
}

export default new MultiDelegationBetaModal();
