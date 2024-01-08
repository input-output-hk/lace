import CommonDrawerElements from '../CommonDrawerElements';
/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class ManageStakingDrawer extends CommonDrawerElements {
  private CONTAINER = '[data-testid="custom-drawer"]';
  private NEXT_BUTTON = '[data-testid="preferences-next-button"]';
  private DELEGATION_INFO_CARD = '[data-testid="delegation-info-card"]';
  private DELEGATION_CARD_STATUS_LABEL = '[data-testid="overview.delegationCard.label.status-label"]';
  private DELEGATION_CARD_STATUS_VALUE = '[data-testid="overview.delegationCard.label.status-value"]';
  private DELEGATION_CARD_BALANCE_LABEL = '[data-testid="overview.delegationCard.label.balance-label"]';
  private DELEGATION_CARD_BALANCE_VALUE = '[data-testid="overview.delegationCard.label.balance-value"]';
  private DELEGATION_CARD_POOLS_LABEL = '[data-testid="overview.delegationCard.label.pools-label"]';
  private DELEGATION_CARD_POOLS_VALUE = '[data-testid="overview.delegationCard.label.pools-value"]';
  private DELEGATION_CARD_CHART_PIE_SLICE = '.recharts-pie-sector';
  private DELEGATION_SELECTED_POOLS_LABEL = '[data-testid="manage-delegation-selected-pools-label"]';
  private DELEGATION_ADD_POOLS_BUTTON = '[data-testid="manage-delegation-add-pools-btn"]';
  private POOL_DETAILS_NAME = '[data-testid="pool-details-name"]';
  private POOL_DETAILS_ICON_EXPANDED = '[data-testid="pool-details-icon-up"]';
  private POOL_DETAILS_ICON_TRUNCATED = '[data-testid="pool-details-icon-down"]';
  private POOL_DETAILS_CARD = '[data-testid="pool-details-card"]';
  private POOL_DETAILS_SAVED_RATIO_TITLE = '[data-testid="pool-details-card-saved-ratio-title"]';
  private POOL_DETAILS_SAVED_RATIO_TOOLTIP_ICON = '[data-testid="pool-details-card-saved-ratio-tooltip"]';
  private POOL_DETAILS_SAVED_RATIO_VALUE = '[data-testid="pool-details-card-saved-ratio-value"]';
  private POOL_DETAILS_ACTUAL_RATIO_TITLE = '[data-testid="pool-details-card-actual-ratio-title"]';
  private POOL_DETAILS_ACTUAL_RATIO_TOOLTIP_ICON = '[data-testid="pool-details-card-actual-ratio-tooltip"]';
  private POOL_DETAILS_ACTUAL_RATIO_VALUE = '[data-testid="pool-details-card-actual-ratio-value"]';
  private POOL_DETAILS_ACTUAL_STAKE_TITLE = '[data-testid="pool-details-card-actual-stake-title"]';
  private POOL_DETAILS_ACTUAL_STAKE_TOOLTIP_ICON = '[data-testid="pool-details-card-actual-stake-tooltip"]';
  private POOL_DETAILS_ACTUAL_STAKE_VALUE = '[data-testid="pool-details-card-actual-stake-value"]';
  private POOL_DETAILS_ACTUAL_STAKE_COIN_SYMBOL = '[data-testid="pool-details-card-actual-stake-coin-symbol"]';
  private POOL_DETAILS_EDIT_RATIO_TITLE = '[data-testid="pool-details-card-edit-ratio-title"]';
  private POOL_DETAILS_RATIO_TITLE = '[data-testid="pool-details-card-ratio-title"]';
  private POOL_DETAILS_RATIO_INPUT = '[data-testid="pool-details-card-ratio-input"]';
  private POOL_DETAILS_RATIO_PERCENT_SIGN = '[data-testid="pool-details-card-ratio-input-percent-sign"]';
  private POOL_DETAILS_SLIDER_MINUS = '[data-testid="pool-details-card-slider-minus"]';
  private POOL_DETAILS_SLIDER_PLUS = '[data-testid="pool-details-card-slider-plus"]';
  private POOL_DETAILS_SLIDER = '[data-testid="pool-details-card-slider-item"]';
  private POOL_DETAILS_REMOVE_POOL_BUTTON = '[data-testid="pool-details-card-remove-pool-button"]';
  private TOOLTIP = 'div.ant-tooltip-inner';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.NEXT_BUTTON);
  }

  get infoCard(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.DELEGATION_INFO_CARD);
  }

  get delegationCardStatusLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.infoCard.$(this.DELEGATION_CARD_STATUS_LABEL);
  }

  get delegationCardStatusValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.infoCard.$(this.DELEGATION_CARD_STATUS_VALUE);
  }

  get delegationCardBalanceLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.infoCard.$(this.DELEGATION_CARD_BALANCE_LABEL);
  }

  get delegationCardBalanceValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.infoCard.$(this.DELEGATION_CARD_BALANCE_VALUE);
  }

  get delegationCardPoolsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.infoCard.$(this.DELEGATION_CARD_POOLS_LABEL);
  }

  get delegationCardPoolsValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.infoCard.$(this.DELEGATION_CARD_POOLS_VALUE);
  }

  get delegationCardChartSlices(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.infoCard.$$(this.DELEGATION_CARD_CHART_PIE_SLICE);
  }

  get selectedPoolsLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.DELEGATION_SELECTED_POOLS_LABEL);
  }

  get addPoolsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.container.$(this.DELEGATION_ADD_POOLS_BUTTON);
  }

  get poolDetailsName(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.container.$$(this.POOL_DETAILS_NAME);
  }

  get poolDetailsIconExpanded(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.container.$$(this.POOL_DETAILS_ICON_EXPANDED);
  }

  get poolDetailsIconTruncated(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.container.$$(this.POOL_DETAILS_ICON_TRUNCATED);
  }

  get poolDetailsCard(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return this.container.$$(this.POOL_DETAILS_CARD);
  }

  poolDetailsSavedRatioTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_SAVED_RATIO_TITLE);
  }

  poolDetailsSavedRatioTooltipIcon(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_SAVED_RATIO_TOOLTIP_ICON);
  }

  poolDetailsSavedRatioValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_SAVED_RATIO_VALUE);
  }

  poolDetailsActualRatioTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_RATIO_TITLE);
  }

  poolDetailsActualRatioTooltipIcon(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_RATIO_TOOLTIP_ICON);
  }

  poolDetailsActualRatioValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_RATIO_VALUE);
  }

  poolDetailsActualStakeTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_STAKE_TITLE);
  }

  poolDetailsActualStakeTooltipIcon(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_STAKE_TOOLTIP_ICON);
  }

  poolDetailsActualStakeValue(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_STAKE_VALUE);
  }

  poolDetailsActualStakeCoinSymbol(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_ACTUAL_STAKE_COIN_SYMBOL);
  }

  poolDetailsEditRatioTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_EDIT_RATIO_TITLE);
  }

  poolDetailsRatioTitle(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_RATIO_TITLE);
  }

  poolDetailsRatioInput(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_RATIO_INPUT);
  }

  poolDetailsRatioPercentSign(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_RATIO_PERCENT_SIGN);
  }

  poolDetailsSliderMinus(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_SLIDER_MINUS);
  }

  poolDetailsSliderPlus(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_SLIDER_PLUS);
  }

  poolDetailsSlider(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_SLIDER);
  }

  poolDetailsRemovePoolButton(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return this.poolDetailsCard[index].$(this.POOL_DETAILS_REMOVE_POOL_BUTTON);
  }

  get tooltips(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TOOLTIP);
  }

  tooltip(index: number): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return this.tooltips[index];
  }

  async expandAllPoolsDetails() {
    await this.poolDetailsIconTruncated[0].waitForClickable();
    const truncatedPoolsCount = await this.poolDetailsIconTruncated.length;
    for (let i = 0; i < truncatedPoolsCount; i++) {
      await (await this.poolDetailsIconTruncated)[0].click();
    }
  }

  async hideAllPoolsDetails() {
    const expandedPoolsCount = await this.poolDetailsIconExpanded.length;
    for (let i = 0; i < expandedPoolsCount; i++) {
      await (await this.poolDetailsIconExpanded)[0].waitForClickable();
      await (await this.poolDetailsIconExpanded)[0].click();
    }
  }

  async clickAddStakePoolButton() {
    await this.addPoolsButton.waitForClickable();
    await this.addPoolsButton.click();
  }

  async removePoolsFromDelegationPortfolio(poolsToRemove: number) {
    await this.poolDetailsRemovePoolButton(0).waitForClickable();
    for (let i = 0; i < poolsToRemove; i++) {
      await this.poolDetailsRemovePoolButton(0).click();
    }
  }

  async hoverOverRemovePoolButtonForPool(tooltipForPool: number) {
    await this.poolDetailsRemovePoolButton(tooltipForPool - 1).moveTo();
  }
}

export default new ManageStakingDrawer();
