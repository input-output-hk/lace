/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';

class StakingPage {
  private SEARCH_ICON = '[data-testid="search-icon"]';
  private SEARCH_INPUT = '.ant-select-selection-search input';
  private SEARCH_INPUT_PLACEHOLDER_IN_POPUP = '.ant-select-selection-placeholder';
  private STAKE_POOL_LIST_HEADER_TEMPLATE = '[data-testid="stake-pool-list-header-###COLUMN_NAME###"]';
  private EMPTY_SEARCH_RESULTS_IMAGE = '[data-testid="stake-pool-table-empty-image"]';
  private EMPTY_SEARCH_RESULTS_MESSAGE = '[data-testid="stake-pool-table-empty-message"]';
  private SEARCH_LOADER = '[data-testid="search-loader"]';
  private STAKE_POOL_LIST_COST = '[data-testid="stake-pool-list-cost"]';
  private STATS_TITLE = '[data-testid="stats-title"]';
  private STATS_VALUE = '[data-testid="stats-value"]';
  private STAKE_POOL_TABLE_ROW = '[data-testid="stake-pool-table-item"]';

  get title() {
    return SectionTitle.sectionTitle;
  }

  get counter() {
    return SectionTitle.sectionCounter;
  }

  get stakingPageSearchIcon() {
    return $(this.SEARCH_ICON);
  }

  get statsTitle() {
    return $$(this.STATS_TITLE);
  }

  get stakingPageSearchInput() {
    return $(this.SEARCH_INPUT);
  }

  get searchInputPlaceholderInPopup() {
    return $(this.SEARCH_INPUT_PLACEHOLDER_IN_POPUP);
  }

  get rows() {
    return $$(this.STAKE_POOL_TABLE_ROW);
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

  get statsValue() {
    return $$(this.STATS_VALUE);
  }

  get emptySearchResultsImage() {
    return $(this.EMPTY_SEARCH_RESULTS_IMAGE);
  }

  get emptySearchResultsMessage() {
    return $(this.EMPTY_SEARCH_RESULTS_MESSAGE);
  }

  get searchLoader() {
    return $(this.SEARCH_LOADER);
  }

  stakingPoolListColumnHeader(listHeader: string) {
    const headerColumnSelector = this.STAKE_POOL_LIST_HEADER_TEMPLATE.replace('###COLUMN_NAME###', listHeader);
    return $(headerColumnSelector);
  }

  stakingPoolWithName(poolName: string) {
    return $(`h6=${poolName}`);
  }
}

export default new StakingPage();
