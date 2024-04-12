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
import { mapColumnNameStringToEnum, sortColumnContent } from '../../utils/stakePoolListContent';

class MultidelegationPageAssert {
  assertSeeStakingOnPoolsCounter = async (poolsCount: number) => {
    await MultidelegationPage.delegationCardPoolsValue.waitForClickable({ timeout: 120_000 });
    const poolsCounter = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    expect(poolsCounter).to.equal(poolsCount);
  };

  assertSeeSearchResultsCountExact = async (items: number) => {
    await browser.waitUntil(async () => (await MultidelegationPage.displayedPools.length) === items, {
      timeout: 20_000,
      timeoutMsg: `Search result does not match exact items count expected: ${items}`
    });
  };

  assertSeeTitle = async () => {
    expect(await MultidelegationPage.title.getText()).to.equal(await t('staking.sectionTitle'));
  };

  assertSeeTabs = async () => {
    await MultidelegationPage.overviewTab.waitForDisplayed();
    expect(await MultidelegationPage.overviewTab.getText()).to.equal(await t('root.nav.overviewTitle', 'staking'));
    await MultidelegationPage.browseTab.waitForDisplayed();
    expect(await MultidelegationPage.browseTab.getText()).to.equal(await t('root.nav.browsePoolsTitle', 'staking'));
    await MultidelegationPage.activityTab.waitForDisplayed();
    expect(await MultidelegationPage.activityTab.getText()).to.equal(await t('root.nav.activityTitle', 'staking'));
  };

  assertSeeDelegationCardDetailsInfo = async () => {
    expect(await MultidelegationPage.delegationCardBalanceLabel.getText()).to.equal(
      await t('overview.delegationCard.label.balance', 'staking')
    );
    const adaValue = Number(
      (await MultidelegationPage.delegationCardBalanceValue.getText()).split(' ')[0].replace(',', '')
    );
    expect(adaValue).to.be.greaterThan(0);
    expect(await MultidelegationPage.delegationCardPoolsLabel.getText()).to.equal(
      await t('overview.delegationCard.label.pools', 'staking')
    );
    const poolsCount = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    expect(poolsCount).to.be.greaterThan(0);
    expect(await MultidelegationPage.delegationCardStatusLabel.getText()).to.equal(
      await t('overview.delegationCard.label.status', 'staking')
    );
    const statusValue = await MultidelegationPage.delegationCardStatusValue.getText();
    poolsCount === 1
      ? expect(statusValue).to.equal(await t('overview.delegationCard.statuses.simpleDelegation', 'staking'))
      : expect(statusValue).to.equal(await t('overview.delegationCard.statuses.multiDelegation', 'staking'));
    expect(await MultidelegationPage.delegationCardChartSlices.length).to.equal(poolsCount);
  };

  assertSeeDelegatedPoolCards = async () => {
    const poolsCount = Number(await MultidelegationPage.delegationCardPoolsValue.getText());
    for (let i = 0; i < poolsCount; i++) {
      await this.assertSeeDelegatedPoolDetailsInfo(i);
      await this.assertSeeDelegatedPoolFundsInfo(i);
    }
  };

  assertSeeDelegatedPoolDetailsInfo = async (index: number) => {
    await MultidelegationPage.delegatedPoolLogo(index).waitForClickable();
    await MultidelegationPage.delegatedPoolName(index).waitForClickable();
    await MultidelegationPage.delegatedPoolTicker(index).waitForClickable();
    expect(await MultidelegationPage.delegatedPoolRosTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.ros', 'staking')
    );
    const rosValue = await MultidelegationPage.delegatedPoolRosValue(index).getText();
    if (rosValue !== '-') {
      expect(rosValue).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    }
    expect(await MultidelegationPage.delegatedPoolFeeTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.fee', 'staking')
    );
    const feeValueNumber = (await MultidelegationPage.delegatedPoolFeeValue(index).getText()).split('tADA')[0];
    expect(feeValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolMarginTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.margin', 'staking')
    );
    expect(await MultidelegationPage.delegatedPoolMarginValue(index).getText()).to.match(
      TestnetPatterns.PERCENT_DOUBLE_REGEX
    );
  };

  assertSeeDelegatedPoolFundsInfo = async (index: number) => {
    expect(await MultidelegationPage.delegatedPoolStakedTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.totalStaked', 'staking')
    );
    const stakedValueNumber = (await MultidelegationPage.delegatedPoolStakedValue(index).getText()).split('tADA')[0];
    expect(stakedValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
    expect(await MultidelegationPage.delegatedPoolLastRewardsTitle(index).getText()).to.equal(
      await t('overview.stakingInfoCard.lastReward', 'staking')
    );
    const lastRewardsValueNumber = (await MultidelegationPage.delegatedPoolLastRewardsValue(index).getText()).split(
      'tADA'
    )[0];
    expect(lastRewardsValueNumber).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
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
      await t('browsePools.stakePoolTableBrowser.searchInputPlaceholder', 'staking')
    );
  };

  assertSeeSearchResults = async (expectedResultsCount: number) => {
    const rowsNumber = (await MultidelegationPage.displayedPools).length;
    expect(rowsNumber).to.equal(expectedResultsCount);
    await MultidelegationPage.emptySearchResultsImage.waitForDisplayed({ reverse: expectedResultsCount > 0 });
    await MultidelegationPage.emptySearchResultsMessage.waitForDisplayed({ reverse: expectedResultsCount > 0 });
    if (expectedResultsCount === 0) {
      expect(await MultidelegationPage.emptySearchResultsMessage.getText()).to.equal(
        await t('browsePools.stakePoolTableBrowser.emptyMessage', 'staking')
      );
    } else {
      for (let index = 0; index < expectedResultsCount; index++) {
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
      }
    }
  };

  assertSeeFirstSearchResultWithTicker = async (expectedTicker: string) => {
    const firstStakePool = new StakePoolListItem(0);
    await firstStakePool.ticker.waitForDisplayed();
    expect(await firstStakePool.ticker.getText()).to.equal(expectedTicker);
  };

  assertSeeTooltipForColumn = async (columnName: string) => {
    await MultidelegationPage.tooltip.waitForDisplayed();
    let expectedTooltipText;
    switch (columnName) {
      case 'Ticker':
        expectedTooltipText = await t('browsePools.tooltips.ticker', 'staking');
        break;
      case 'Saturation':
        expectedTooltipText = await t('browsePools.tooltips.saturation', 'staking');
        break;
      case 'ROS':
        expectedTooltipText = await t('browsePools.tooltips.ros', 'staking');
        break;
      case 'Cost':
        expectedTooltipText = await t('browsePools.tooltips.cost', 'staking');
        break;
      case 'Margin':
        expectedTooltipText = await t('browsePools.tooltips.margin', 'staking');
        break;
      case 'Blocks':
        expectedTooltipText = await t('browsePools.tooltips.blocks', 'staking');
        break;
      case 'Pledge':
        expectedTooltipText = await t('browsePools.tooltips.pledge', 'staking');
        break;
      case 'Live Stake':
        expectedTooltipText = await t('browsePools.tooltips.liveStake', 'staking');
        break;
      default:
        throw new Error(`Unsupported column name: ${columnName}`);
    }
    expect(await MultidelegationPage.tooltip.getText()).to.equal(expectedTooltipText);
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
      expect(await stakePoolListItem.ros.getText()).to.equal('-');
      // expect(await stakePoolListItem.ros.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX); // TODO: update when issue with ROS not returned is resolved
    }
    await stakePoolListItem.cost.waitForDisplayed();
    expect(await stakePoolListItem.cost.getText()).to.match(TestnetPatterns.NUMBER_REGEX);
    await stakePoolListItem.margin.waitForDisplayed();
    expect(await stakePoolListItem.margin.getText()).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    await stakePoolListItem.blocks.waitForDisplayed();
    expect((await stakePoolListItem.blocks.getText()).replaceAll(',', '')).to.match(TestnetPatterns.BLOCKS_REGEX);
    await stakePoolListItem.pledge.waitForDisplayed();
    expect(await stakePoolListItem.pledge.getText()).to.match(TestnetPatterns.PLEDGE_REGEX);
    await stakePoolListItem.liveStake.waitForDisplayed();
    expect((await stakePoolListItem.liveStake.getText()).slice(0, -1)).to.match(TestnetPatterns.NUMBER_DOUBLE_REGEX);
  };

  assertSeeStakePoolRows = async () => {
    const rowsNumber = (await MultidelegationPage.displayedPools).length; // TODO: update to use pools counter when LW-9726 is resolved

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

  assertSeeStakePoolsSorted = async (
    stakePoolsDisplayType: 'list rows' | 'cards',
    sortingOption: StakePoolListColumnName,
    order: SortingOrder,
    poolLimit?: number
  ) => {
    await MultidelegationPage.waitForPoolsCounterToBeGreaterThanZero();
    poolLimit ??= await MultidelegationPage.getNumberOfPoolsFromCounter();
    if (stakePoolsDisplayType === 'cards') {
      // TODO: add code to handle grid cards
      throw new Error('Please add validation for grid cards sorting');
    } else {
      const columnContent = await MultidelegationPage.extractColumnContent(
        mapColumnNameStringToEnum(sortingOption),
        poolLimit
      );
      const sortedColumnContent = await sortColumnContent(
        columnContent,
        mapColumnNameStringToEnum(sortingOption),
        order
      );

      expect(columnContent).to.not.be.empty;
      expect(columnContent).to.deep.equal(sortedColumnContent);
    }
  };
}

export default new MultidelegationPageAssert();
