/* global WebdriverIO */
import SectionTitle from '../sectionTitle';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class StakingPage {
  private STATS_TITLE = '[data-testid="stats-title"]';
  private STATS_VALUE = '[data-testid="stats-value"]';

  get counter() {
    return SectionTitle.sectionCounter;
  }

  get statsTitle(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.STATS_TITLE);
  }

  get statsValues(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.STATS_VALUE);
  }

  async getStatsTickers(): Promise<string[]> {
    const statsText = new Set(['Fee', 'Total staked', 'Total rewards', 'Last reward']);
    const statsNumber = await this.statsValues.length;
    const tickers = [];
    for (let i = 0; i < statsNumber; i++) {
      if (statsText.has(await this.statsTitle[i].getText())) {
        tickers.push(await this.statsValues[i].getText());
      }
    }
    return tickers;
  }
}

export default new StakingPage();
