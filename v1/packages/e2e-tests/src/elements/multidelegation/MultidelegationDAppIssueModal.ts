/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class MultidelegationDAppIssueModal {
  private CONTAINER = '.ant-modal-body';
  private TITLE = '[data-testid="stake-modal-title"]';
  private DESCRIPTION = '[data-testid="stake-modal-description"]';
  private GOT_IT_BUTTON = '[data-testid="multidelegation-dapp-modal-button"]';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get gotItButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GOT_IT_BUTTON);
  }

  async clickOnGotItButton(): Promise<void> {
    await this.gotItButton.waitForClickable({ timeout: 10_000 });
    await this.gotItButton.click();
  }
}

export default new MultidelegationDAppIssueModal();
