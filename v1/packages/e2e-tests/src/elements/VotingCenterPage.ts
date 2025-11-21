/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class VotingCenterPage {
  private readonly BANNER = '[data-testid="voting-center-banner"]';
  private readonly TITLE = '[data-testid="voting-center-banner-title"]';
  private readonly DESCRIPTION = '[data-testid="voting-center-banner-description"]';
  private readonly ACCESS_GOV_TOOL_BUTTON = '[data-testid="voting-center-gov-tool-button"]';
  private readonly ACCESS_TEMPO_VOTE_BUTTON = '[data-testid="voting-center-tempo-vote-button"]';

  get banner(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BANNER);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get accessGovToolButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACCESS_GOV_TOOL_BUTTON);
  }

  get accessTempoVoteButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACCESS_TEMPO_VOTE_BUTTON);
  }

  async clickOnButton(button: 'Access Gov.tool' | 'Access Tempo.vote'): Promise<void> {
    switch (button) {
      case 'Access Gov.tool':
        await this.accessGovToolButton.waitForClickable();
        await this.accessGovToolButton.click();
        break;
      case 'Access Tempo.vote':
        await this.accessTempoVoteButton.waitForClickable();
        await this.accessTempoVoteButton.click();
        break;
      default:
        throw new Error(`Unsupported button: ${button}`);
    }
  }
}

export default new VotingCenterPage();
