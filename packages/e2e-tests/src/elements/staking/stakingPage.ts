/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';

class StakingPage {
  private SEARCH_INPUT = '.ant-select-selection-search input';
  private SEARCH_LOADER = '[data-testid="search-loader"]';
  private STAKE_POOL_LIST_COST = '[data-testid="stake-pool-list-cost"]';
  private STATS_TITLE = '[data-testid="stats-title"]';
  private STATS_VALUE = '[data-testid="stats-value"]';

  get title() {
    return SectionTitle.sectionTitle;
  }

  get counter() {
    return SectionTitle.sectionCounter;
  }

  get statsTitle() {
    return $$(this.STATS_TITLE);
  }

  get stakingPageSearchInput() {
    return $(this.SEARCH_INPUT);
  }

  get statsValues() {
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

  get stakePoolListCostList() {
    return $$(this.STAKE_POOL_LIST_COST);
  }

  get searchLoader() {
    return $(this.SEARCH_LOADER);
  }

  stakingPoolWithName(poolName: string) {
    return $(`h6=${poolName}`);
  }
}

export default new StakingPage();
