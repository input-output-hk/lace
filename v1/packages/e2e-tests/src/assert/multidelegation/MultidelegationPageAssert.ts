import MultidelegationPage from '../../elements/multidelegation/MultidelegationPage';
import { browser } from '@wdio/globals';
import { expect } from 'chai';
import { t } from '../../utils/translationService';
import { TestnetPatterns } from '../../support/patterns';
import NetworkComponent from '../../elements/multidelegation/NetworkInfoComponent';
import { StakePoolListItem } from '../../elements/multidelegation/StakePoolListItem';
import Tooltip from '../../elements/Tooltip';
import testContext from '../../utils/testContext';
import { StakePoolGridCard } from '../../elements/multidelegation/StakePoolGridCard';
import { StakePoolListColumnName } from '../../types/staking';
import { SortingOrder } from '../../types/sortingOrder';
import {
  mapColumnNameStringToEnum,
  mapSortingOptionToColumnNameEnum,
  sortColumnContent
} from '../../utils/stakePoolListContent';
import { StakePoolListColumn } from '../../enums/StakePoolListColumn';
import { StakePoolSortingOption } from '../../enums/StakePoolSortingOption';
import StakingInfoCard from '../../elements/multidelegation/StakingInfoCard';
import { isPopupMode } from '../../utils/pageUtils';
import { sortGridContent } from '../../utils/stakePoolGridContent';

class MultidelegationPageAssert {
  assertSeeStakingOnPoolsCounter = async (poolsCount: number) => {
    await MultidelegationPage.delegationCardPoolsValue.waitForClickable({ timeout: 120_000 });
    const poolsCounter = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    expect(poolsCounter).to.equal(poolsCount);
  };

  assertSeeSearchResultsCountGreaterOrEqual = async (expectedPoolsCount: number) => {
    await browser.waitUntil(async () => (await MultidelegationPage.displayedPools.length) >= expectedPoolsCount, {
      timeout: 20_000,
      timeoutMsg: `There should be ${expectedPoolsCount} or more stake pools returned`
    });
  };

  assertSeeTitle = async () => {
    expect(await MultidelegationPage.title.getText()).to.equal(await t('staking.sectionTitle'));
  };

  assertSeeTabs = async () => {
    await MultidelegationPage.overviewTab.waitForDisplayed();
    expect(await MultidelegationPage.overviewTab.getText()).to.equal(await t('root.nav.overviewTitle'));
    await MultidelegationPage.browseTab.waitForDisplayed();
    expect(await MultidelegationPage.browseTab.getText()).to.equal(await t('root.nav.browsePoolsTitle'));
    await MultidelegationPage.activityTab.waitForDisplayed();
    expect(await MultidelegationPage.activityTab.getText()).to.equal(await t('root.nav.activityTitle'));
  };

  assertSeeDelegationCardDetailsInfo = async () => {
    expect(await MultidelegationPage.delegationCardBalanceLabel.getText()).to.equal(
      await t('overview.delegationCard.label.balance')
    );
    const adaValue = Number(
      (await MultidelegationPage.delegationCardBalanceValue.getText()).split(' ')[0].replace(',', '')
    );
    expect(adaValue).to.be.greaterThan(0);
    expect(await MultidelegationPage.delegationCardPoolsLabel.getText()).to.equal(
      await t('overview.delegationCard.label.pools')
    );
    const poolsCount = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    expect(poolsCount).to.be.greaterThan(0);
    expect(await MultidelegationPage.delegationCardStatusLabel.getText()).to.equal(
      await t('overview.delegationCard.label.status')
    );
    const statusValue = await MultidelegationPage.delegationCardStatusValue.getText();
    poolsCount === 1
      ? expect(statusValue).to.equal(await t('overview.delegationCard.statuses.simpleDelegation'))
      : expect(statusValue).to.equal(await t('overview.delegationCard.statuses.multiDelegation'));
    expect(await MultidelegationPage.delegationCardChartSlices.length).to.equal(poolsCount);
  };

  assertSeeDelegatedPoolCards = async (hasRewards: boolean, isPopupView: boolean) => {
    const poolsCount = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    for (let i = 0; i < poolsCount; i++) {
      await this.assertSeeDelegatedPoolDetailsInfo(i);
      await this.assertSeeDelegatedPoolFundsInfo(i, hasRewards, isPopupView);
    }
  };

  assertSeeDelegatedPoolDetailsInfo = async (index: number) => {
    await MultidelegationPage.delegatedPoolLogo(index).waitForClickable();
    await MultidelegationPage.delegatedPoolName(index).waitForClickable();
    await MultidelegationPage.delegatedPoolTicker(index).waitForClickable();
    expect(await MultidelegationPage.delegatedPoolRosTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.ros')
    );
    const rosValue = await MultidelegationPage.delegatedPoolRosValue(index).getText();
    if (rosValue !== '-') {
      expect(rosValue).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    }
    expect(await MultidelegationPage.delegatedPoolFeeTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.fee')
    );
    const feeValueNumber = (await MultidelegationPage.delegatedPoolFeeValue(index).getText()).split('tADA')[0];
    expect(feeValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolMarginTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.margin')
    );
    expect(await MultidelegationPage.delegatedPoolMarginValue(index).getText()).to.match(
      TestnetPatterns.PERCENT_DOUBLE_REGEX
    );
  };

  assertSeeDelegatedPoolFundsInfo = async (index: number, hasRewards: boolean, isPopupView: boolean) => {
    // Total staked
    expect(await MultidelegationPage.delegatedPoolTotalStakedTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.totalStaked')
    );
    const totalStakedValueText = await MultidelegationPage.delegatedPoolTotalStakedValue(index).getText();
    expect(totalStakedValueText).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
    const totalStakedValue = Number(totalStakedValueText.split('\n')[0]);
    hasRewards
      ? expect(totalStakedValue, 'Total staked not greater than 0!').to.be.greaterThan(0)
      : expect(totalStakedValue, 'Total staked not equal to 0!').to.equal(0);

    // Last reward
    expect(await MultidelegationPage.delegatedPoolLastRewardsTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.lastReward')
    );
    const lastRewardsValueText = await MultidelegationPage.delegatedPoolLastRewardsValue(index).getText();
    expect(lastRewardsValueText).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
    const lastRewardsValue = Number(lastRewardsValueText.split('\n')[0]);
    hasRewards
      ? expect(lastRewardsValue, 'Last reward not greater than 0!').to.be.greaterThan(0)
      : expect(lastRewardsValue, 'Last reward not equal to 0!').to.equal(0);

    // Total rewards (extended view only!)
    if (!isPopupView) {
      expect(await MultidelegationPage.delegatedPoolTotalRewardsTitle(index).getText()).to.equal(
        await t('overview.stakingInfoCard.totalRewards')
      );
      const totalRewardsValueText = await MultidelegationPage.delegatedPoolTotalRewardsValue(index).getText();
      expect(totalRewardsValueText).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
      const totalRewardsValue = Number(totalRewardsValueText.split('\n')[0]);
      hasRewards
        ? expect(totalRewardsValue, 'Total reward not greater than 0!').to.be.greaterThan(0)
        : expect(totalRewardsValue, 'Total rewards not equal to 0!').to.equal(0);
    }
  };

  assertSeeStakingPoolOnYourPoolsList = async (poolName: string) => {
    await browser.waitUntil(
      async () => {
        const delegatedPoolsCount = await MultidelegationPage.delegatedPoolItems.length;
        const delegatedPoolsNames = [];
        for (let index = 0; index < delegatedPoolsCount; index++) {
          delegatedPoolsNames.push(await MultidelegationPage.delegatedPoolName(index).getText());
        }
        return delegatedPoolsNames.includes(poolName);
      },
      {
        timeout: 180_000,
        interval: 2000,
        timeoutMsg: `failed while waiting for stake pool: ${poolName}`
      }
    );
  };

  assertNetworkContainerExistsWithContent = async () => {
    await NetworkComponent.networkContainer.waitForDisplayed();
    await NetworkComponent.networkTitle.waitForDisplayed();
    expect(await NetworkComponent.networkTitle.getText()).to.equal(await t('cardano.networkInfo.title'));
    await NetworkComponent.currentEpochLabel.waitForDisplayed();
    expect(await NetworkComponent.currentEpochLabel.getText()).to.equal(await t('cardano.networkInfo.currentEpoch'));
    await NetworkComponent.currentEpochDetail.waitForDisplayed();
    expect(await NetworkComponent.currentEpochDetail.getText()).to.match(TestnetPatterns.NUMBER_REGEX);
    await NetworkComponent.epochEndLabel.waitForDisplayed();
    expect(await NetworkComponent.epochEndLabel.getText()).to.equal(await t('cardano.networkInfo.epochEnd'));
    await NetworkComponent.epochEndDetail.waitForDisplayed();
    await NetworkComponent.totalPoolsLabel.waitForDisplayed();
    expect(await NetworkComponent.totalPoolsLabel.getText()).to.equal(await t('cardano.networkInfo.totalPools'));
    await NetworkComponent.totalPoolsDetail.waitForDisplayed();
    expect(await NetworkComponent.totalPoolsDetail.getText()).to.match(TestnetPatterns.NUMBER_REGEX);
    await NetworkComponent.percentageStakedLabel.waitForDisplayed();
    expect(await NetworkComponent.percentageStakedLabel.getText()).to.equal(
      await t('cardano.networkInfo.percentageStaked')
    );
    await NetworkComponent.percentageStakedDetail.waitForDisplayed();
    expect(await NetworkComponent.percentageStakedDetail.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  };

  assertSeeSearchComponent = async () => {
    await MultidelegationPage.searchIcon.waitForDisplayed();
    await MultidelegationPage.stakingPageSearchInput.waitForDisplayed();
    expect(await MultidelegationPage.stakingPageSearchInput.getAttribute('placeholder')).to.equal(
      await t('browsePools.stakePoolTableBrowser.searchInputPlaceholder')
    );
  };

  assertSeeSearchResults = async (expectedResultsCount: number, view: 'grid' | 'list') => {
    const searchResultsCount =
      view === 'list'
        ? (await MultidelegationPage.displayedPools).length
        : (await MultidelegationPage.displayedCards).length;
    expect(searchResultsCount).to.equal(expectedResultsCount);
    await MultidelegationPage.emptySearchResultsImage.waitForDisplayed({ reverse: expectedResultsCount > 0 });
    await MultidelegationPage.emptySearchResultsMessage.waitForDisplayed({ reverse: expectedResultsCount > 0 });
    if (expectedResultsCount === 0) {
      expect(await MultidelegationPage.emptySearchResultsMessage.getText()).to.equal(
        await t('browsePools.stakePoolTableBrowser.emptyMessage')
      );
    } else {
      for (let index = 0; index < expectedResultsCount; index++) {
        view === 'list'
          ? await this.assertSearchedPoolItemIsDisplayedCorrectlyInListView(index)
          : await this.assertSearchedPoolItemIsDisplayedCorrectlyInGridView(index);
      }
    }
  };

  assertSearchedPoolItemIsDisplayedCorrectlyInListView = async (index: number) => {
    const stakePoolListItem = new StakePoolListItem(index);
    await stakePoolListItem.checkbox.waitForDisplayed();
    await stakePoolListItem.ticker.waitForDisplayed();
    await stakePoolListItem.saturation.waitForDisplayed();
    if (process.env.USE_ROS_STAKING_COLUMN) {
      await stakePoolListItem.ros.waitForDisplayed();
    }
    await stakePoolListItem.cost.waitForDisplayed();
    await stakePoolListItem.margin.waitForDisplayed();
    await stakePoolListItem.blocks.waitForDisplayed();
    await stakePoolListItem.pledge.waitForDisplayed();
    await stakePoolListItem.liveStake.waitForDisplayed();
  };

  assertSearchedPoolItemIsDisplayedCorrectlyInGridView = async (index: number) => {
    const stakePoolGridCard = new StakePoolGridCard(index);
    await stakePoolGridCard.title.waitForDisplayed();
    await stakePoolGridCard.saturation.waitForDisplayed();
    await stakePoolGridCard.saturationProgressBar.waitForDisplayed();
  };

  assertSeeFirstSearchResultWithTicker = async (expectedTicker: string) => {
    const firstStakePool = new StakePoolListItem(0);
    await firstStakePool.ticker.waitForDisplayed();
    expect(await firstStakePool.ticker.getText()).to.equal(expectedTicker);
  };

  assertSeeTooltipForColumn = async (column: StakePoolListColumn) => {
    await MultidelegationPage.tooltip.waitForStable();
    await MultidelegationPage.tooltip.waitForDisplayed();
    let expectedTooltipText: string;
    switch (column) {
      case StakePoolListColumn.Ticker:
        expectedTooltipText = await t('browsePools.tooltips.ticker');
        break;
      case StakePoolListColumn.Saturation:
        expectedTooltipText = await t('browsePools.tooltips.saturation');
        break;
      case StakePoolListColumn.ROS:
        expectedTooltipText = await t('browsePools.tooltips.ros');
        break;
      case StakePoolListColumn.Cost:
        expectedTooltipText = await t('browsePools.tooltips.cost');
        break;
      case StakePoolListColumn.Margin:
        expectedTooltipText = await t('browsePools.tooltips.margin');
        break;
      case StakePoolListColumn.Blocks:
        expectedTooltipText = await t('browsePools.tooltips.blocks');
        break;
      case StakePoolListColumn.Pledge:
        expectedTooltipText = await t('browsePools.tooltips.pledge');
        break;
      case StakePoolListColumn.LiveStake:
        expectedTooltipText = await t('browsePools.tooltips.liveStake');
        break;
      default:
        throw new Error(`Unsupported column name: ${column}`);
    }
    await browser.waitUntil(async () => (await MultidelegationPage.tooltip.getText()) === expectedTooltipText, {
      interval: 500,
      timeout: 5000,
      timeoutMsg: `Current tooltip text: ${await MultidelegationPage.tooltip.getText()}\nExpected tooltip text: ${expectedTooltipText}`
    });
  };

  assertSeeStakePoolRow = async (index?: number) => {
    const stakePoolListItem = new StakePoolListItem(index);
    await stakePoolListItem.checkbox.waitForDisplayed();
    await stakePoolListItem.ticker.waitForDisplayed();
    expect(await stakePoolListItem.ticker.getText()).to.not.be.empty;
    await stakePoolListItem.saturation.waitForDisplayed();
    expect(await stakePoolListItem.saturation.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    if (process.env.USE_ROS_STAKING_COLUMN) {
      await stakePoolListItem.ros.waitForDisplayed();
      expect(await stakePoolListItem.ros.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    }
    await stakePoolListItem.cost.waitForDisplayed();
    expect(await stakePoolListItem.cost.getText()).to.match(TestnetPatterns.ABBREVIATED_NUMBER_REGEX);
    await stakePoolListItem.margin.waitForDisplayed();
    expect(await stakePoolListItem.margin.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    await stakePoolListItem.blocks.waitForDisplayed();
    expect((await stakePoolListItem.blocks.getText()).replaceAll(',', '')).to.match(TestnetPatterns.BLOCKS_REGEX);
    await stakePoolListItem.pledge.waitForDisplayed();
    expect(await stakePoolListItem.pledge.getText()).to.match(TestnetPatterns.ABBREVIATED_NUMBER_REGEX);
    await stakePoolListItem.liveStake.waitForDisplayed();
    expect((await stakePoolListItem.liveStake.getText()).slice(0, -1)).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  };

  assertSeeStakePoolRows = async () => {
    const rowsNumber = await MultidelegationPage.displayedPools.length;

    for (let i = 0; i < rowsNumber; i++) {
      await this.assertSeeStakePoolRow(i);
    }
  };

  assertSeeCurrentlyStakingTooltip = async (currencyCode = 'USD') => {
    await Tooltip.component.waitForDisplayed();
    expect(await Tooltip.label.getText()).contains(`${currencyCode} Value`);
    expect(await Tooltip.value.getText()).to.match(TestnetPatterns.USD_VALUE_NO_SUFFIX_REGEX); // TODO: update when LW-8935 is resolved
  };

  assertSeeStakePoolListRowSkeleton = async (shouldBeDisplayed: boolean) => {
    await MultidelegationPage.stakePoolListRowSkeleton.waitForDisplayed({ reverse: !shouldBeDisplayed });
  };

  assertSeeStakePoolGridCardSkeleton = async (shouldBeDisplayed: boolean) => {
    await MultidelegationPage.stakePoolCardSkeleton.waitForDisplayed({ reverse: !shouldBeDisplayed });
  };

  assertSeeStakePoolViewType = async (view: 'grid' | 'list') => {
    const ariaChecked = 'aria-checked';
    switch (view) {
      case 'grid':
        await MultidelegationPage.gridViewToggle.waitForStable();
        await MultidelegationPage.gridContainer.waitForDisplayed();
        expect(await MultidelegationPage.gridViewToggle.getAttribute(ariaChecked)).to.equal('true');
        break;
      case 'list':
        await MultidelegationPage.listViewToggle.waitForStable();
        await MultidelegationPage.listContainer.waitForDisplayed();
        expect(await MultidelegationPage.listViewToggle.getAttribute(ariaChecked)).to.equal('true');
        break;
      default:
        throw new Error(`Unsupported view: ${view}`);
    }
  };

  assertSeePreviouslySelectedStakePools = async (view: 'grid' | 'list') => {
    await MultidelegationPage.searchLoader.waitForDisplayed({ reverse: true });
    const expectedTickers = testContext.load('selectedTickers') as string[];
    const selectedTickers = await MultidelegationPage.getTickersOfSelectedPools(view);
    expect(selectedTickers).to.deep.equal(expectedTickers);
  };

  assertsSeeCardsInARow = async (expectedCardsCount: number) => {
    await MultidelegationPage.gridContainer.waitForStable();
    const rowWidth = await MultidelegationPage.gridContainer.getSize('width');
    const cardWidth = await new StakePoolGridCard(0).container.getSize('width');
    const cardsInARow = Math.floor(rowWidth / cardWidth);
    expect(cardsInARow).to.equal(expectedCardsCount);
  };

  assertSeeColumnSortingIndicator = async (column: StakePoolListColumnName, order: 'ascending' | 'descending') => {
    await (
      await MultidelegationPage.getColumnSortingIndicator(mapColumnNameStringToEnum(column), order)
    ).waitForDisplayed();
  };

  assertSeeSortingOptionOrderButton = async (
    sortingOption: StakePoolSortingOption,
    order: 'ascending' | 'descending'
  ) => {
    await (
      await MultidelegationPage.moreOptionsComponent.getSortingOptionOrderButton(sortingOption, order)
    ).waitForDisplayed();
  };

  assertSeeStakePoolsSorted = async (
    stakePoolsDisplayType: 'list rows' | 'cards',
    sortingOption: StakePoolSortingOption,
    order: SortingOrder,
    poolLimit?: number
  ) => {
    await MultidelegationPage.waitForPoolsCounterToBeGreaterThanZero();
    poolLimit ??= await MultidelegationPage.getNumberOfPoolsFromCounter();
    if (stakePoolsDisplayType === 'cards') {
      const gridContent = await MultidelegationPage.extractGridContent(sortingOption, poolLimit);
      const sortedGridContent = await sortGridContent(gridContent, sortingOption, order);
      expect(gridContent).to.not.be.empty;
      expect(gridContent).to.deep.equal(sortedGridContent);
    } else {
      const columnContent = await MultidelegationPage.extractColumnContent(
        mapSortingOptionToColumnNameEnum(sortingOption),
        poolLimit
      );
      const sortedColumnContent = await sortColumnContent(
        columnContent,
        mapSortingOptionToColumnNameEnum(sortingOption),
        order
      );

      expect(columnContent).to.not.be.empty;
      expect(columnContent).to.deep.equal(sortedColumnContent);
    }
  };

  assertSeeTooltipForSortingOption = async (sortingOption: StakePoolSortingOption) => {
    await browser.pause(800); // Those tooltips are displayed after delay
    await MultidelegationPage.sortingOptionTooltip.waitForStable();
    await MultidelegationPage.sortingOptionTooltip.waitForDisplayed();
    let expectedTooltipText;
    switch (sortingOption) {
      case StakePoolSortingOption.Ticker:
        expectedTooltipText = await t('browsePools.tooltips.ticker');
        break;
      case StakePoolSortingOption.Saturation:
        expectedTooltipText = await t('browsePools.tooltips.saturation');
        break;
      case StakePoolSortingOption.ROS:
        expectedTooltipText = await t('browsePools.tooltips.ros');
        break;
      case StakePoolSortingOption.Cost:
        expectedTooltipText = await t('browsePools.tooltips.cost');
        break;
      case StakePoolSortingOption.Margin:
        expectedTooltipText = await t('browsePools.tooltips.margin');
        break;
      case StakePoolSortingOption.ProducedBlocks:
        expectedTooltipText = await t('browsePools.tooltips.blocks');
        break;
      case StakePoolSortingOption.Pledge:
        expectedTooltipText = await t('browsePools.tooltips.pledge');
        break;
      case StakePoolSortingOption.LiveStake:
        expectedTooltipText = await t('browsePools.tooltips.liveStake');
        break;
      default:
        throw new Error(`Unsupported column name: ${sortingOption}`);
    }
    expect(await MultidelegationPage.sortingOptionTooltip.getText()).to.equal(expectedTooltipText);
  };

  assertSeeCurrentlyStakingComponent = async (
    index: number,
    poolName: string,
    poolTickerOrId: string,
    hasMetadata = true
  ) => {
    const stakingInfoCard = new StakingInfoCard(index);
    await stakingInfoCard.container.waitForDisplayed();

    await stakingInfoCard.logo.waitForDisplayed();

    await stakingInfoCard.name.waitForDisplayed();
    expect(await stakingInfoCard.name.getText()).to.equal(poolName);

    await stakingInfoCard.ticker.waitForDisplayed();
    hasMetadata
      ? expect(await stakingInfoCard.ticker.getText()).to.equal(poolTickerOrId)
      : expect(await stakingInfoCard.ticker.getText()).to.contain(poolTickerOrId.slice(0, 6));

    await this.assertSeeStatsROS(stakingInfoCard);
    await this.assertSeeStatsFee(stakingInfoCard);
    await this.assertSeeStatsMargin(stakingInfoCard);

    const isPopup = await isPopupMode();
    if (!isPopup) {
      await this.assertSeeStatsTotalRewards(stakingInfoCard);
    }
    await this.assertSeeStatsTotalStaked(stakingInfoCard);
    await this.assertSeeLastReward(stakingInfoCard);
  };

  private async assertSeeLastReward(stakingInfoCard: StakingInfoCard) {
    await stakingInfoCard.statsLastReward.title.waitForDisplayed();
    expect(await stakingInfoCard.statsLastReward.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.lastReward.title')
    );
    await stakingInfoCard.statsLastReward.value.waitForDisplayed();
    expect(await stakingInfoCard.statsLastReward.value.getText()).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
  }

  private async assertSeeStatsTotalStaked(stakingInfoCard: StakingInfoCard) {
    await stakingInfoCard.statsTotalStaked.title.waitForDisplayed();
    expect(await stakingInfoCard.statsTotalStaked.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.totalStaked.title')
    );
    await stakingInfoCard.statsTotalStaked.value.waitForDisplayed();
    expect(await stakingInfoCard.statsTotalStaked.value.getText()).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
  }

  private async assertSeeStatsTotalRewards(stakingInfoCard: StakingInfoCard) {
    await stakingInfoCard.statsTotalRewards.title.waitForDisplayed();
    expect(await stakingInfoCard.statsTotalRewards.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.totalRewards.title')
    );
    await stakingInfoCard.statsTotalRewards.value.waitForDisplayed();
    expect(await stakingInfoCard.statsTotalRewards.value.getText()).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX_OR_0
    );
  }

  private async assertSeeStatsMargin(stakingInfoCard: StakingInfoCard) {
    await stakingInfoCard.statsMargin.title.waitForDisplayed();
    expect(await stakingInfoCard.statsMargin.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.Margin')
    );
    await stakingInfoCard.statsMargin.value.waitForDisplayed();
    expect(await stakingInfoCard.statsMargin.value.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  }

  private async assertSeeStatsFee(stakingInfoCard: StakingInfoCard) {
    await stakingInfoCard.statsFee.title.waitForDisplayed();
    expect(await stakingInfoCard.statsFee.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.Fee')
    );
    await stakingInfoCard.statsFee.value.waitForDisplayed();
    expect(await stakingInfoCard.statsFee.value.getText()).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
  }

  private async assertSeeStatsROS(stakingInfoCard: StakingInfoCard) {
    await stakingInfoCard.statsROS.title.waitForDisplayed();
    expect(await stakingInfoCard.statsROS.title.getText()).to.equal(
      await t('browserView.staking.stakingInfo.stats.ros')
    );
    await stakingInfoCard.statsROS.value.waitForDisplayed();
    expect(await stakingInfoCard.statsROS.value.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  }
}

export default new MultidelegationPageAssert();
