/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import MultidelegationPageAssert from '../../assert/multidelegationPageAssert';
import { browser } from '@wdio/globals';
import { clearInputFieldValue } from '../../utils/inputFieldUtils';

class MultidelegationPage {
  private OVERVIEW_TAB = '[data-testid="overview-tab"]';
  private BROWSE_POOLS_TAB = '[data-testid="browse-tab"]';
  private DELEGATIONCARD_POOLS_VALUE = '[data-testid="overview.delegationCard.label.pools-value"]';
  private SEARCH_INPUT = '.ant-select-selection-search input';
  private POOL_ITEM = '[data-testid="stake-pool-table-item"]';
  private POOL_NAME = '[data-testid="stake-pool-list-name"]';
  private STAKE_BUTTON = '[data-testid="stake-button"]';
  private PORTFOLIO_BAR_BTN_NEXT = '[data-testid="portfoliobar-btn-next"]';
  private MANAGE_STAKING_BTN_NEXT = '[data-testid="preferencesNextButton"]';
  private CONFIRMATION_BTN_NEXT = '[data-testid="stake-pool-confirmation-btn"]';

  get title() {
    return SectionTitle.sectionTitle;
  }

  get overviewTab() {
    return $(this.OVERVIEW_TAB);
  }

  get browseTab() {
    return $(this.BROWSE_POOLS_TAB);
  }

  get delegationCardPoolsValue() {
    return $(this.DELEGATIONCARD_POOLS_VALUE);
  }

  get stakingPageSearchInput() {
    return $(this.SEARCH_INPUT);
  }

  get poolsItems() {
    return $$(this.POOL_ITEM);
  }

  async getPoolByName(name: string) {
    return (await this.poolsItems.find(
      async (item) => (await item.$(this.POOL_NAME).getText()) === name
    )) as WebdriverIO.Element;
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

  async clickButtonOnSection(buttonName: string, section: string) {
    switch (section) {
      case 'portfolio bar':
        await this.portfolioBarBtnNext.waitForClickable();
        buttonName === 'Next' ? await this.portfolioBarBtnNext.click() : '';
        break;
      case 'manage staking':
        await this.manageStakingBtnNext.waitForClickable();
        buttonName === 'Next' ? await this.manageStakingBtnNext.click() : '';
        break;
      case 'confirmation':
        await this.confirmationBtnNext.waitForClickable();
        await this.confirmationBtnNext.click();
        break;
    }
  }
}

export default new MultidelegationPage();
