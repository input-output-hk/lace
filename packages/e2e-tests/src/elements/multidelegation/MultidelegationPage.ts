/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import MultidelegationPageAssert from '../../assert/multidelegation/MultidelegationPageAssert';
import { browser } from '@wdio/globals';
import { clearInputFieldValue } from '../../utils/inputFieldUtils';
import { ChainablePromiseElement } from 'webdriverio';
import StakePoolDetails from '../staking/stakePoolDetails';
import testContext from '../../utils/testContext';
import { isPopupMode } from '../../utils/pageUtils';
import CommonDrawerElements from '../CommonDrawerElements';

class MultidelegationPage {
  private OVERVIEW_TAB = '[data-testid="overview-tab"]';
  private BROWSE_POOLS_TAB = '[data-testid="browse-tab"]';
  private DELEGATIONCARD_STATUS_LABEL = '[data-testid="overview.delegationCard.label.status-label"]';
  private DELEGATIONCARD_STATUS_VALUE = '[data-testid="overview.delegationCard.label.status-value"]';
  private DELEGATIONCARD_BALANCE_LABEL = '[data-testid="overview.delegationCard.label.balance-label"]';
  private DELEGATIONCARD_BALANCE_VALUE = '[data-testid="overview.delegationCard.label.balance-value"]';
  private DELEGATIONCARD_POOLS_LABEL = '[data-testid="overview.delegationCard.label.pools-label"]';
  private DELEGATIONCARD_POOLS_VALUE = '[data-testid="overview.delegationCard.label.pools-value"]';
  private DELEGATIONCARD_CHART_PIE_SLICE = '.recharts-pie-sector';
  private SEARCH_INPUT = 'input[data-testid="search-input"]';
  private SEARCH_ICON = '[data-testid="search-icon"]';
  private SEARCH_LOADER = '[data-testid="search-loader"]';
  private EMPTY_SEARCH_RESULTS_IMAGE = '[data-testid="stake-pool-table-empty-image"]';
  private EMPTY_SEARCH_RESULTS_MESSAGE = '[data-testid="stake-pool-table-empty-message"]';
  private POOL_ITEM = '[data-testid="stake-pool-table-item"]';
  private POOL_NAME = '[data-testid="stake-pool-list-name"]';
  private STAKE_BUTTON = '[data-testid="stake-button"]';
  private PORTFOLIO_BAR_BTN_NEXT = '[data-testid="portfoliobar-btn-next"]';
  private MANAGE_STAKING_BTN_NEXT = '[data-testid="preferences-next-button"]';
  private CONFIRMATION_BTN_NEXT = '[data-testid="stake-pool-confirmation-btn"]';
  private DELEGATED_POOL_ITEM = '[data-testid="delegated-pool-item"]';
  private DELEGATED_POOL_LOGO = '[data-testid="stake-pool-logo"]';
  private DELEGATED_POOL_NAME = '[data-testid="stake-pool-name"]';
  private DELEGATED_POOL_TICKER = '[data-testid="stake-pool-ticker"]';
  private DELEGATED_POOL_ROS_TITLE = '[data-testid="stats-apy-container"] [data-testid="stats-title"]';
  private DELEGATED_POOL_ROS_VALUE = '[data-testid="stats-apy-container"] [data-testid="stats-value"]';
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

  get title() {
    return SectionTitle.sectionTitle;
  }

  get overviewTab() {
    return $(this.OVERVIEW_TAB);
  }

  get browseTab() {
    return $(this.BROWSE_POOLS_TAB);
  }

  get delegationCardStatusLabel() {
    return $(this.DELEGATIONCARD_STATUS_LABEL);
  }

  get delegationCardStatusValue() {
    return $(this.DELEGATIONCARD_STATUS_VALUE);
  }

  get delegationCardBalanceLabel() {
    return $(this.DELEGATIONCARD_BALANCE_LABEL);
  }

  get delegationCardBalanceValue() {
    return $(this.DELEGATIONCARD_BALANCE_VALUE);
  }

  get delegationCardPoolsLabel() {
    return $(this.DELEGATIONCARD_POOLS_LABEL);
  }

  get delegationCardPoolsValue() {
    return $(this.DELEGATIONCARD_POOLS_VALUE);
  }

  get delegationCardChartSlices() {
    return $$(this.DELEGATIONCARD_CHART_PIE_SLICE);
  }

  get delegatedPoolItems() {
    return $$(this.DELEGATED_POOL_ITEM);
  }

  get stakingPageSearchInput() {
    return $(this.SEARCH_INPUT);
  }

  get searchIcon() {
    return $(this.SEARCH_ICON);
  }

  get searchLoader() {
    return $(this.SEARCH_LOADER);
  }

  get emptySearchResultsImage() {
    return $(this.EMPTY_SEARCH_RESULTS_IMAGE);
  }

  get emptySearchResultsMessage() {
    return $(this.EMPTY_SEARCH_RESULTS_MESSAGE);
  }

  get poolsItems() {
    return $$(this.POOL_ITEM);
  }

  get stakeButton() {
    return $(this.STAKE_BUTTON);
  }

  get portfolioBarBtnNext() {
    return $(this.PORTFOLIO_BAR_BTN_NEXT);
  }

  get manageStakingBtnNext() {
    return $(this.MANAGE_STAKING_BTN_NEXT);
  }

  get confirmationBtnNext() {
    return $(this.CONFIRMATION_BTN_NEXT);
  }

  get stakingPoolInfoItems() {
    return $$(this.STAKING_POOL_INFO);
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

  async getPoolByName(name: string) {
    return (await this.poolsItems.find(
      async (item) => (await item.$(this.POOL_NAME).getText()) === name
    )) as WebdriverIO.Element;
  }

  async clickOnTab(tab: string) {
    switch (tab) {
      case 'Overview':
        await this.overviewTab.waitForClickable();
        await this.overviewTab.click();
        break;
      case 'Browse pools':
        await this.browseTab.waitForClickable();
        await this.browseTab.click();
        break;
      default:
        throw new Error(`Unsupported tab name: ${tab}`);
    }
  }

  async markPoolsForDelegation(poolsToStake: string) {
    const poolsToMark: string[] = [];
    poolsToStake.split(',').forEach((poolName) => {
      poolsToMark.push(poolName.trim());
    });
    for (const poolName of poolsToMark) {
      await this.fillSearch(poolName);
      await MultidelegationPageAssert.assertSeeSearchResultsCountExact(1);
      await this.markStakePoolWithName(poolName);
      await this.stakingPageSearchInput.click();
      await clearInputFieldValue(await this.stakingPageSearchInput);
      await MultidelegationPageAssert.assertSeeSearchResultsCountMinimum(6);
    }
  }

  async fillSearch(poolName: string) {
    await this.stakingPageSearchInput.waitForClickable();
    await this.stakingPageSearchInput.scrollIntoView();
    await this.stakingPageSearchInput.click();
    await browser.keys([...poolName]);
    await browser.pause(500);
  }

  async markStakePoolWithName(poolName: string) {
    await this.hoverOverPoolWithName(poolName);
    await this.stakeButton.waitForClickable();
    await this.stakeButton.click();
  }

  private async hoverOverPoolWithName(poolName: string) {
    const poolItem = await this.getPoolByName(poolName);
    await poolItem.moveTo();
  }

  async clickButtonOnSection(section: string) {
    switch (section) {
      case 'portfolio bar':
        await this.portfolioBarBtnNext.waitForClickable();
        await this.portfolioBarBtnNext.click();
        break;
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
    const poolIDsToBeSaved = [];
    const stakingPoolInfoItems = await this.stakingPoolInfoItems;
    for (const stakingPoolInfoItem of stakingPoolInfoItems) {
      await stakingPoolInfoItem.click();
      await StakePoolDetails.poolId.waitForDisplayed();
      const poolId = await StakePoolDetails.poolId.getText();
      poolIDsToBeSaved.push(poolId);
      (await isPopupMode())
        ? await new CommonDrawerElements().clickHeaderBackButton()
        : await new CommonDrawerElements().clickHeaderCloseButton();
    }

    testContext.save('stakePoolsInUse', poolIDsToBeSaved);
  }

  async clickOnStakePoolWithName(poolName: string) {
    const poolItem = await this.getPoolByName(poolName);
    await poolItem.click();
  }
}

export default new MultidelegationPage();
