/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import MultidelegationPageAssert from '../../assert/multidelegation/MultidelegationPageAssert';
import { browser } from '@wdio/globals';
import { clearInputFieldValue } from '../../utils/inputFieldUtils';
import { ChainablePromiseElement } from 'webdriverio';
import testContext from '../../utils/testContext';
import { isPopupMode } from '../../utils/pageUtils';
import CommonDrawerElements from '../CommonDrawerElements';
import { StakePoolListItem } from './StakePoolListItem';
import { StakePoolGridCard } from './StakePoolGridCard';
import StakePoolDetailsDrawer from './StakePoolDetailsDrawer';
import MoreOptionsComponent from './MoreOptionsComponent';
import { StakePoolListColumn } from '../../enums/StakePoolListColumn';
import { StakePoolSortingOption } from '../../enums/StakePoolSortingOption';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class MultidelegationPage {
  private ACTIVITY_TAB = '[data-testid="activity-tab"]';
  private OVERVIEW_TAB = '[data-testid="overview-tab"]';
  private BROWSE_POOLS_TAB = '[data-testid="browse-tab"]';
  private DELEGATION_CARD_STATUS_LABEL = '[data-testid="overview.delegationCard.label.status-label"]';
  private DELEGATION_CARD_STATUS_VALUE = '[data-testid="overview.delegationCard.label.status-value"]';
  private DELEGATION_CARD_BALANCE_LABEL = '[data-testid="overview.delegationCard.label.balance-label"]';
  private DELEGATION_CARD_BALANCE_VALUE = '[data-testid="overview.delegationCard.label.balance-value"]';
  private DELEGATION_CARD_POOLS_LABEL = '[data-testid="overview.delegationCard.label.pools-label"]';
  private DELEGATION_CARD_POOLS_VALUE = '[data-testid="overview.delegationCard.label.pools-value"]';
  private DELEGATION_CARD_CHART_PIE_SLICE = '.recharts-pie-sector';
  private SEARCH_INPUT = 'input[data-testid="search-input"]';
  private SEARCH_ICON = '[data-testid="search-icon"]';
  private SEARCH_LOADER = '[data-testid="search-loader"]';
  private EMPTY_SEARCH_RESULTS_IMAGE = '[data-testid="stake-pool-table-empty-image"]';
  private EMPTY_SEARCH_RESULTS_MESSAGE = '[data-testid="stake-pool-table-empty-message"]';
  private STAKE_POOL_LIST_SCROLL_WRAPPER = '[data-testid="stake-pool-list-scroll-wrapper"]';
  private POOL_ITEM = '[data-testid="stake-pool-item"]';
  private POOL_TICKER = '[data-testid="stake-pool-list-ticker"]';
  private COLUMN_HEADER_TICKER = '[data-testid="stake-pool-list-header-ticker"]';
  private COLUMN_HEADER_SATURATION = '[data-testid="stake-pool-list-header-saturation"]';
  private COLUMN_HEADER_ROS = '[data-testid="stake-pool-list-header-ros"]';
  private COLUMN_HEADER_COST = '[data-testid="stake-pool-list-header-cost"]';
  private COLUMN_HEADER_MARGIN = '[data-testid="stake-pool-list-header-margin"]';
  private COLUMN_HEADER_BLOCKS = '[data-testid="stake-pool-list-header-blocks"]';
  private COLUMN_HEADER_PLEDGE = '[data-testid="stake-pool-list-header-pledge"]';
  private COLUMN_HEADER_LIVE_STAKE = '[data-testid="stake-pool-list-header-liveStake"]';
  private COLUMN_SORTING_INDICATOR_TEMPLATE = '[data-testid="stake-pool-sort-order-###"]';
  private MANAGE_STAKING_BTN_NEXT = '[data-testid="preferences-next-button"]';
  private CONFIRMATION_BTN_NEXT = '[data-testid="stake-pool-confirmation-btn"]';
  private DELEGATED_POOL_ITEM = '[data-testid="delegated-pool-item"]';
  private DELEGATED_POOL_LOGO = '[data-testid="stake-pool-logo"]';
  private DELEGATED_POOL_NAME = '[data-testid="stake-pool-name"]';
  private DELEGATED_POOL_TICKER = '[data-testid="stake-pool-ticker"]';
  private DELEGATED_POOL_ROS_TITLE = '[data-testid="stats-ros-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_ROS_VALUE = '[data-testid="stats-ros-container"] [data-testid="stats-value"]';
  private DELEGATED_POOL_FEE_TITLE = '[data-testid="stats-fee-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_FEE_VALUE = '[data-testid="stats-fee-container"] [data-testid="stats-value"]';
  private DELEGATED_POOL_MARGIN_TITLE = '[data-testid="stats-margin-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_MARGIN_VALUE = '[data-testid="stats-margin-container"] [data-testid="stats-value"]';
  private DELEGATED_POOL_STAKED_TITLE = '[data-testid="stats-total-staked-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_STAKED_VALUE = '[data-testid="stats-total-staked-container"] [data-testid="stats-value"]';
  private DELEGATED_POOL_TOTAL_REWARDS_TITLE =
    '[data-testid="stats-total-rewards-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_TOTAL_REWARDS_VALUE =
    '[data-testid="stats-total-rewards-container"] [data-testid="stats-value"]';
  private DELEGATED_POOL_LAST_REWARDS_TITLE = '[data-testid="stats-last-reward-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_LAST_REWARDS_VALUE = '[data-testid="stats-last-reward-container"] [data-testid="stats-value"]';
  private STAKING_POOL_INFO = '[data-testid="staking-pool-info"]';
  private TOOLTIP = 'div.ant-tooltip-inner';
  private SORTING_OPTION_TOOLTIP = '[data-testid="tooltip-content"]';
  private CHECKBOX = '[data-testid="stake-pool-list-checkbox"]';
  private MANAGE_BTN = '[data-testid="manage-btn"]';
  private GRID_VIEW_TOGGLE = '[data-testid="grid-view-toggle"]';
  private LIST_VIEW_TOGGLE = '[data-testid="list-view-toggle"]';
  private STAKE_POOLS_GRID_CONTAINER = '[data-testid="stake-pools-grid-container"]';
  private STAKE_POOLS_LIST_CONTAINER = '[data-testid="stake-pools-list-container"]';
  private STAKE_POOL_LIST_ROW_SKELETON = '[data-testid="stake-pool-list-row-skeleton"]';
  private STAKE_POOL_CARD_SKELETON = '[data-testid="stake-pool-card-skeleton"]';
  private SELECTED_STAKE_POOLS_IN_GRID_VIEW = '[data-testid="selected-pools-list"] [data-testid="stake-pool-card"]';
  private SELECTED_STAKE_POOLS_IN_LIST_VIEW = '[data-testid="selected-pools-list"] [data-testid="stake-pool-item"]';
  private POOLS_COUNTER = '[data-testid="pools-counter"]';
  private POOL_CARD = '[data-testid="stake-pool-card"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionTitle;
  }

  get overviewTab(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OVERVIEW_TAB);
  }

  get browseTab(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BROWSE_POOLS_TAB);
  }

  get activityTab(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVITY_TAB);
  }

  get gridViewToggle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GRID_VIEW_TOGGLE);
  }

  get listViewToggle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LIST_VIEW_TOGGLE);
  }

  get gridContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STAKE_POOLS_GRID_CONTAINER);
  }

  get listContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STAKE_POOLS_LIST_CONTAINER);
  }

  get delegationCardStatusLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATION_CARD_STATUS_LABEL);
  }

  get delegationCardStatusValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATION_CARD_STATUS_VALUE);
  }

  get delegationCardBalanceLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATION_CARD_BALANCE_LABEL);
  }

  get delegationCardBalanceValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATION_CARD_BALANCE_VALUE);
  }

  get delegationCardPoolsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATION_CARD_POOLS_LABEL);
  }

  get delegationCardPoolsValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATION_CARD_POOLS_VALUE);
  }

  get delegationCardChartSlices(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DELEGATION_CARD_CHART_PIE_SLICE);
  }

  get delegatedPoolItems(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DELEGATED_POOL_ITEM);
  }

  get stakingPageSearchInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEARCH_INPUT);
  }

  get searchIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEARCH_ICON);
  }

  get searchLoader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEARCH_LOADER);
  }

  get emptySearchResultsImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_SEARCH_RESULTS_IMAGE);
  }

  get emptySearchResultsMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_SEARCH_RESULTS_MESSAGE);
  }

  get displayedPools(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $(this.STAKE_POOL_LIST_SCROLL_WRAPPER).$$(this.POOL_ITEM);
  }

  get displayedCards(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $(this.STAKE_POOL_LIST_SCROLL_WRAPPER).$$(this.POOL_CARD);
  }

  get columnHeaderTicker(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_TICKER);
  }

  get columnHeaderSaturation(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_SATURATION);
  }

  get columnHeaderROS(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_ROS);
  }

  get columnHeaderCost(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_COST);
  }

  get columnHeaderMargin(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_MARGIN);
  }

  get columnHeaderBlocks(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_BLOCKS);
  }

  get columnHeaderPledge(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_PLEDGE);
  }

  get columnHeaderLiveStake(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLUMN_HEADER_LIVE_STAKE);
  }

  get manageStakingBtnNext(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MANAGE_STAKING_BTN_NEXT);
  }

  get confirmationBtnNext(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRMATION_BTN_NEXT);
  }

  get stakingPoolInfoItems(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.STAKING_POOL_INFO);
  }

  get tooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP);
  }

  get sortingOptionTooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SORTING_OPTION_TOOLTIP);
  }

  get manageBtn(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MANAGE_BTN);
  }

  get poolsCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.POOLS_COUNTER);
  }

  delegatedPoolLogo(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_LOGO);
  }

  delegatedPoolName(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_NAME);
  }

  delegatedPoolTicker(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_TICKER);
  }

  delegatedPoolRosTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_ROS_TITLE);
  }

  delegatedPoolRosValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_ROS_VALUE);
  }

  delegatedPoolFeeTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_FEE_TITLE);
  }

  delegatedPoolFeeValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_FEE_VALUE);
  }

  delegatedPoolMarginTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_MARGIN_TITLE);
  }

  delegatedPoolMarginValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_MARGIN_VALUE);
  }

  delegatedPoolStakedTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_STAKED_TITLE);
  }

  delegatedPoolStakedValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_STAKED_VALUE);
  }

  delegatedPoolTotalRewardsTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_TOTAL_REWARDS_TITLE);
  }

  delegatedPoolTotalRewardsValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_TOTAL_REWARDS_VALUE);
  }

  delegatedPoolLastRewardsTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_LAST_REWARDS_TITLE);
  }

  delegatedPoolLastRewardsValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $$(this.DELEGATED_POOL_ITEM)[index].$(this.DELEGATED_POOL_LAST_REWARDS_VALUE);
  }

  get stakePoolListRowSkeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STAKE_POOL_LIST_ROW_SKELETON);
  }

  get stakePoolCardSkeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STAKE_POOL_CARD_SKELETON);
  }

  get selectedPoolsInGridView(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.SELECTED_STAKE_POOLS_IN_GRID_VIEW);
  }

  get selectedPoolsInListView(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.SELECTED_STAKE_POOLS_IN_LIST_VIEW);
  }

  get moreOptionsComponent(): typeof MoreOptionsComponent {
    return MoreOptionsComponent;
  }

  async getPoolByTicker(ticker: string) {
    return (await this.displayedPools.find(
      async (item) => (await item.$(this.POOL_TICKER).getText()) === ticker
    )) as WebdriverIO.Element;
  }

  async getColumnSortingIndicator(columnName: StakePoolListColumn, order: 'ascending' | 'descending') {
    const orderDirection = order === 'ascending' ? 'asc' : 'desc';
    const orderDirectionSelector = `${this.COLUMN_SORTING_INDICATOR_TEMPLATE.replace('###', orderDirection)}`;
    let selector = '';

    switch (columnName) {
      case StakePoolListColumn.Ticker:
        selector = `${this.COLUMN_HEADER_TICKER} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.Saturation:
        selector = `${this.COLUMN_HEADER_SATURATION} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.ROS:
        selector = `${this.COLUMN_HEADER_ROS} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.Cost:
        selector = `${this.COLUMN_HEADER_COST} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.Margin:
        selector = `${this.COLUMN_HEADER_MARGIN} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.Blocks:
        selector = `${this.COLUMN_HEADER_BLOCKS} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.Pledge:
        selector = `${this.COLUMN_HEADER_PLEDGE} ${orderDirectionSelector}`;
        break;
      case StakePoolListColumn.LiveStake:
        selector = `${this.COLUMN_HEADER_LIVE_STAKE} ${orderDirectionSelector}`;
        break;
      default:
        throw new Error(`Unsupported column name: ${columnName}`);
    }

    return $(selector);
  }

  async clickAndGetTabStateAttribute(tab: 'Overview' | 'Browse pools') {
    let tabElement;
    switch (tab) {
      case 'Overview':
        tabElement = this.overviewTab;
        break;
      case 'Browse pools':
        tabElement = this.browseTab;
    }
    await tabElement.waitForClickable();
    await tabElement.click();
    return tabElement.getAttribute('data-state');
  }

  async openTab(tab: 'Overview' | 'Browse pools') {
    await browser.waitUntil(async () => (await this.clickAndGetTabStateAttribute(tab)) === 'active', {
      timeout: 8000,
      interval: 1000
    });
  }

  async markPoolsForDelegation(poolsToStake: string) {
    const poolsToMark: string[] = [];
    poolsToStake.split(',').forEach((ticker) => {
      poolsToMark.push(ticker.trim());
    });
    for (const ticker of poolsToMark) {
      await this.fillSearch(ticker);
      await MultidelegationPageAssert.assertSeeSearchResultsCountGreaterOrEqual(1);
      await this.markStakePoolWithTicker(ticker);
      await this.stakingPageSearchInput.click();
      await clearInputFieldValue(await this.stakingPageSearchInput);
    }
  }

  async selectPoolsForDelegation(numberOfPools: number, viewType: 'grid' | 'list') {
    await this.searchLoader.waitForDisplayed({ reverse: true });
    await browser.pause(500);
    switch (viewType) {
      case 'grid':
        for (let i = 0; i < numberOfPools; i++) {
          await new StakePoolGridCard(i).click();
          if (i === 0) {
            await StakePoolDetailsDrawer.selectPoolForMultiStakingButton.waitForClickable();
            await StakePoolDetailsDrawer.selectPoolForMultiStakingButton.click();
          } else {
            await StakePoolDetailsDrawer.addStakingPollButton.waitForClickable();
            await StakePoolDetailsDrawer.addStakingPollButton.click();
          }
        }
        break;
      case 'list':
        for (let i = 0; i < numberOfPools; i++) {
          await new StakePoolListItem(i).clickOnCheckbox();
        }
        break;
      default:
        throw new Error(`Unsupported view: ${viewType}`);
    }
  }

  async fillSearch(searchTerm: string) {
    await this.stakingPageSearchInput.waitForStable();
    await this.stakingPageSearchInput.waitForClickable();
    await this.stakingPageSearchInput.scrollIntoView();
    await this.stakingPageSearchInput.click();
    await browser.keys([...searchTerm]);
    await browser.pause(500);
  }

  async markStakePoolWithTicker(ticker: string) {
    const poolItem = await this.getPoolByTicker(ticker);
    await poolItem.scrollIntoView();
    await poolItem.$(this.CHECKBOX).click();
  }

  async clickNextButtonOnDrawerSection(section: string) {
    switch (section) {
      case 'manage staking':
        await this.manageStakingBtnNext.waitForClickable();
        await this.manageStakingBtnNext.click();
        break;
      case 'confirmation':
        await this.confirmationBtnNext.waitForClickable();
        await this.confirmationBtnNext.click();
        break;
      default:
        throw new Error(`Unsupported section name: ${section}`);
    }
  }

  async saveIDsOfStakePoolsInUse() {
    const poolDataToBeSaved = [];
    const stakingPoolInfoItems = await this.stakingPoolInfoItems;
    for (const stakingPoolInfoItem of stakingPoolInfoItems) {
      await stakingPoolInfoItem.click();
      await StakePoolDetailsDrawer.container.waitForDisplayed();
      await StakePoolDetailsDrawer.container.waitForStable();
      await StakePoolDetailsDrawer.poolId.waitForDisplayed();
      await StakePoolDetailsDrawer.poolName.waitForDisplayed();
      await StakePoolDetailsDrawer.poolTicker.waitForDisplayed();
      const poolId = await StakePoolDetailsDrawer.poolId.getText();
      const poolName = await StakePoolDetailsDrawer.poolName.getText();
      const poolTicker = await StakePoolDetailsDrawer.poolTicker.getText();
      const poolData = { poolId, poolName, poolTicker };
      poolDataToBeSaved.push(poolData);
      (await isPopupMode())
        ? await new CommonDrawerElements().clickHeaderBackButton()
        : await new CommonDrawerElements().clickHeaderCloseButton();
    }
    testContext.saveWithOverride('stakePoolsInUse', poolDataToBeSaved);
  }

  async clickOnStakePoolWithTicker(poolTicker: string) {
    const poolItem = await this.getPoolByTicker(poolTicker);
    await poolItem.click();
  }

  async hoverOverColumn(column: StakePoolListColumn) {
    let header;

    switch (column) {
      case StakePoolListColumn.Ticker:
        header = await this.columnHeaderTicker;
        break;
      case StakePoolListColumn.Saturation:
        header = await this.columnHeaderSaturation;
        break;
      case StakePoolListColumn.ROS:
        header = await this.columnHeaderROS;
        break;
      case StakePoolListColumn.Cost:
        header = await this.columnHeaderCost;
        break;
      case StakePoolListColumn.Margin:
        header = await this.columnHeaderMargin;
        break;
      case StakePoolListColumn.Blocks:
        header = await this.columnHeaderBlocks;
        break;
      case StakePoolListColumn.Pledge:
        header = await this.columnHeaderPledge;
        break;
      case StakePoolListColumn.LiveStake:
        header = await this.columnHeaderLiveStake;
        break;
      default:
        throw new Error(`Unsupported column name: ${column}`);
    }
    // make hovering over ANTD component more stable
    await header?.$('span span span').moveTo();
  }

  async clickOnColumn(column: StakePoolListColumn) {
    switch (column) {
      case StakePoolListColumn.Ticker:
        await this.columnHeaderTicker.click();
        break;
      case StakePoolListColumn.Saturation:
        await this.columnHeaderSaturation.click();
        break;
      case StakePoolListColumn.ROS:
        await this.columnHeaderROS.click();
        break;
      case StakePoolListColumn.Cost:
        await this.columnHeaderCost.click();
        break;
      case StakePoolListColumn.Margin:
        await this.columnHeaderMargin.click();
        break;
      case StakePoolListColumn.Blocks:
        await this.columnHeaderBlocks.click();
        break;
      case StakePoolListColumn.Pledge:
        await this.columnHeaderPledge.click();
        break;
      case StakePoolListColumn.LiveStake:
        await this.columnHeaderLiveStake.click();
        break;
      default:
        throw new Error(`Unsupported column name: ${column}`);
    }
  }

  async waitForStakePoolListToLoad() {
    await browser.waitUntil(async () => (await this.displayedPools).length > 1, {
      timeout: 30_000,
      timeoutMsg: 'failed while waiting for stake pool list to load'
    });
  }

  async clickManageButton() {
    await this.manageBtn.waitForClickable();
    await this.manageBtn.click();
  }

  async switchPoolsView(viewType: 'grid' | 'list') {
    switch (viewType) {
      case 'grid':
        await this.gridViewToggle.waitForClickable();
        await this.gridViewToggle.click();
        await this.gridViewToggle.waitForStable();
        break;
      case 'list':
        await this.listViewToggle.waitForClickable();
        await this.listViewToggle.click();
        await this.listViewToggle.waitForStable();
        break;
      default:
        throw new Error(`Unsupported view: ${viewType}`);
    }
  }

  async getTickersOfSelectedPools(viewType: 'grid' | 'list') {
    const tickers: string[] = [];
    switch (viewType) {
      case 'grid':
        {
          await this.selectedPoolsInGridView[0].waitForStable();
          const selectedPools = await this.selectedPoolsInGridView;
          for (const pool of selectedPools) {
            const ticker = await new StakePoolGridCard(pool.index, true).title.getText();
            tickers.push(ticker);
          }
        }
        break;
      case 'list': {
        const selectedPools = await this.selectedPoolsInListView;
        for (const pool of selectedPools) {
          const ticker = await new StakePoolListItem(pool.index, true).ticker.getText();
          tickers.push(ticker);
        }
        break;
      }
      default:
        throw new Error(`Unsupported view: ${viewType}`);
    }
    return tickers;
  }

  async saveTickers(viewType: 'grid' | 'list') {
    const selectedTickers = await this.getTickersOfSelectedPools(viewType);
    testContext.save('selectedTickers', selectedTickers);
  }

  async getNumberOfPoolsFromCounter(): Promise<number> {
    const poolsCounterText = await this.poolsCounter.getText();
    return Number(Number(poolsCounterText.replace(/.*\(/, '').replace(')', '').replace(',', '')));
  }

  async waitForPoolsCounterToBeGreaterThanZero(): Promise<void> {
    await this.poolsCounter.waitForDisplayed();
    await browser.waitUntil(async () => (await this.getNumberOfPoolsFromCounter()) > 0, {
      timeoutMsg: 'No stake pools!'
    });
  }

  async extractColumnContent(columnName: StakePoolListColumn, poolLimit = 100): Promise<string[]> {
    const columnContent: string[] = [];

    await this.listContainer.waitForStable();
    await browser.pause(500);

    for (let i = 0; i < poolLimit; i++) {
      const displayedPoolsCounter = await this.displayedPools.length;
      const listItem = new StakePoolListItem(i);
      // Load more pools if all visible ones were processed
      if (i % (displayedPoolsCounter - 1) === 0) {
        await listItem.container.scrollIntoView();
        await this.stakePoolListRowSkeleton.waitForExist({
          reverse: true,
          interval: 100,
          timeout: 30_000
        });
      }
      switch (columnName) {
        case StakePoolListColumn.Ticker:
          columnContent.push(await listItem.ticker.getText());
          break;
        case StakePoolListColumn.Saturation:
          columnContent.push(await listItem.saturation.getText());
          break;
        case StakePoolListColumn.ROS:
          columnContent.push(await listItem.ros.getText());
          break;
        case StakePoolListColumn.Cost:
          columnContent.push(await listItem.cost.getText());
          break;
        case StakePoolListColumn.Margin:
          columnContent.push(await listItem.margin.getText());
          break;
        case StakePoolListColumn.Blocks:
          columnContent.push(await listItem.blocks.getText());
          break;
        case StakePoolListColumn.Pledge:
          columnContent.push(await listItem.pledge.getText());
          break;
        case StakePoolListColumn.LiveStake:
          columnContent.push(await listItem.liveStake.getText());
          break;
        default:
          throw new Error(`Not supported column name: ${columnName}`);
      }
    }

    return columnContent;
  }

  async extractGridContent(sortingOption: StakePoolSortingOption, poolLimit = 100): Promise<string[]> {
    const gridContent: string[] = [];

    await this.gridContainer.waitForStable();
    await browser.pause(500);

    for (let i = 0; i < poolLimit; i++) {
      const displayedPoolsCounter = await this.displayedCards.length;
      const card = new StakePoolGridCard(i);
      // Load more pools if all visible ones were processed
      if (i % (displayedPoolsCounter - 3) === 0) {
        await card.container.scrollIntoView();
        await this.stakePoolCardSkeleton.waitForExist({
          reverse: true,
          interval: 100,
          timeout: 30_000
        });
      }

      switch (sortingOption) {
        case StakePoolSortingOption.Ticker:
          gridContent.push(await card.title.getText());
          break;
        case StakePoolSortingOption.Saturation:
          gridContent.push(await card.saturation.getText());
          break;
        case StakePoolSortingOption.Cost:
        case StakePoolSortingOption.Margin:
        case StakePoolSortingOption.ProducedBlocks:
        case StakePoolSortingOption.Pledge:
        case StakePoolSortingOption.LiveStake:
          gridContent.push(await card.metricValue.getText());
          break;
        default:
          throw new Error(`Not supported sorting option: ${sortingOption}`);
      }
    }
    return gridContent;
  }
}

export default new MultidelegationPage();
