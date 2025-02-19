/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class VotingCenterPage {
  private readonly BANNER = '[data-testid="voting-center-banner"]';
  private readonly TITLE = '[data-testid="voting-center-banner-title"]';
  private readonly DESCRIPTION = '[data-testid="voting-center-banner-description"]';
  private readonly GOV_TOOL_BUTTON = '[data-testid="voting-center-gov-tool-button"]';

  get banner(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get govToolButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GOV_TOOL_BUTTON);
  }

  async clickOnGovToolButton(): Promise<void> {
    await this.govToolButton.waitForClickable();
    await this.govToolButton.click();
  }
}

export default new VotingCenterPage();
