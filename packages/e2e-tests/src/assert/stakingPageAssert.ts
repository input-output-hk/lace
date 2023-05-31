import { StakingPage } from '../elements/staking/stakingPage';
import { NetworkComponent } from '../elements/staking/networkComponent';
import { TestnetPatterns } from '../support/patterns';
import webTester from '../actor/webTester';
import { StakingInfoComponent } from '../elements/staking/stakingInfoComponent';
import { t } from '../utils/translationService';
import { StakePoolListItem } from '../elements/staking/StakePoolListItem';
import { StakingSuccessDrawer } from '../elements/staking/stakingSuccessDrawer';
import { Logger } from '../support/logger';
import StakingExtendedPageObject from '../pageobject/stakingExtendedPageObject';
import { sortColumnContent } from '../utils/stakePoolListContent';
import { expect } from 'chai';
import { StakePool } from '../data/expectedStakePoolsData';
import StakingPasswordDrawer from '../elements/staking/StakingPasswordDrawer';
import StakingErrorDrawer from '../elements/staking/StakingErrorDrawer';

class StakingPageAssert {
  assertSeeTitleWithCounter = async () => {
    const stakingPage = new StakingPage();
    await stakingPage.title.waitForDisplayed();
    await stakingPage.counter.waitForDisplayed();
    await expect(await stakingPage.title.getText()).to.equal(await t('staking.sectionTitle'));
    await expect(await stakingPage.counter.getText()).to.match(TestnetPatterns.COUNTER_REGEX);
  };

  assertSeeTitle = async () => {
    await expect(await new StakingPage().title.getText()).to.equal(await t('staking.sectionTitle'));
  };

  assertNetworkContainerExistsWithContent = async () => {
    const networkComponent = new NetworkComponent();
    await expect(await networkComponent.getNetworkTitle()).to.equal(await t('cardano.networkInfo.title'));
    await expect(await networkComponent.getCurrentEpochLabel()).to.equal(await t('cardano.networkInfo.currentEpoch'));
    await webTester.waitUntilSeeElement(networkComponent.currentEpochDetail());
    await expect(await networkComponent.getEpochEndLabel()).to.equal(await t('cardano.networkInfo.epochEnd'));
    await webTester.waitUntilSeeElement(networkComponent.epochEndDetail());
    await expect(await networkComponent.getTotalPoolsLabel()).to.equal(await t('cardano.networkInfo.totalPools'));
    await webTester.waitUntilSeeElement(networkComponent.totalPoolsDetail());
    await expect(await networkComponent.getPercentageStakedLabel()).to.equal(
      await t('cardano.networkInfo.percentageStaked')
    );
    await webTester.waitUntilSeeElement(networkComponent.percentageStakedDetail());
    // TODO temporarily disabled
    // await expect(await networkComponent.getAvgAPYLabel()).to.equal(await t('cardano.networkInfo.averageRos'));
    // await webTester.waitUntilSeeElement(networkComponent.apyDetail());
    // await expect(await networkComponent.getAvgMarginLabel()).to.equal(await t('cardano.networkInfo.averageMargin'));
    // await webTester.waitUntilSeeElement(networkComponent.marginDetail());
  };

  assertSeeSearchComponent = async () => {
    const stakingPage = new StakingPage();
    await webTester.waitUntilSeeElement(stakingPage.stakingPageSearchIcon());
    await webTester.waitUntilSeeElement(stakingPage.stakingPageSearchInput());
  };

  assertSeePopupSearch = async () => {
    await webTester.waitUntilSeeElementContainingText(await t('cardano.stakePoolSearch.searchPlaceholder'), 20_000);
  };

  assertStakePoolSwitched = async (stakePoolName: string) => {
    const stakingInfoComponent = new StakingInfoComponent();
    await browser.waitUntil(
      async () => (await webTester.getTextValueFromElement(stakingInfoComponent.poolName())) === stakePoolName,
      {
        timeout: 180_000,
        interval: 2000,
        timeoutMsg: 'failed while waiting for stake Pool Switch'
      }
    );
  };

  assertSeeCurrentlyStakingComponent = async (
    expectedStakePool: StakePool,
    mode: 'extended' | 'popup',
    noMetaDataPool = false
  ) => {
    const stakingInfoComponent = new StakingInfoComponent();

    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.title())).to.equal(
      await t('browserView.staking.stakingInfo.title')
    );

    await webTester.seeWebElement(stakingInfoComponent.poolLogo());
    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.poolName())).to.equal(
      expectedStakePool.name
    );

    await (noMetaDataPool
      ? expect(await webTester.getTextValueFromElement(stakingInfoComponent.poolTicker())).to.contain(
          expectedStakePool.poolId.slice(0, 6)
        )
      : expect(await webTester.getTextValueFromElement(stakingInfoComponent.poolTicker())).to.equal(
          expectedStakePool.ticker
        ));

    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.statsApy().title())).to.equal(
      await t('browserView.staking.stakingInfo.stats.ros')
    );
    // TODO BUG LW-5635
    // await expect((await webTester.getTextValueFromElement(stakingInfoComponent.statsApy().value())) as string).to.match(
    //   TestnetPatterns.PERCENT_DOUBLE_REGEX
    // );

    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.statsFee().title())).to.equal(
      await t('browserView.staking.stakingInfo.stats.Fee')
    );
    await expect((await webTester.getTextValueFromElement(stakingInfoComponent.statsFee().value())) as string).to.match(
      TestnetPatterns.ADA_LITERAL_VALUE_REGEX
    );

    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.statsMargin().title())).to.equal(
      await t('browserView.staking.stakingInfo.stats.Margin')
    );
    await expect(
      (await webTester.getTextValueFromElement(stakingInfoComponent.statsMargin().value())) as string
    ).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);

    if (mode === 'extended') {
      await expect(await webTester.getTextValueFromElement(stakingInfoComponent.statsTotalRewards().title())).to.equal(
        await t('browserView.staking.stakingInfo.totalRewards.title')
      );

      await expect(
        (await webTester.getTextValueFromElement(stakingInfoComponent.statsTotalRewards().value())) as string
      ).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX_OR_0);
    }

    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.statsTotalStaked().title())).to.equal(
      await t('browserView.staking.stakingInfo.totalStaked.title')
    );
    await expect(
      (await webTester.getTextValueFromElement(stakingInfoComponent.statsTotalStaked().value())) as string
    ).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);

    await expect(await webTester.getTextValueFromElement(stakingInfoComponent.statsLastReward().title())).to.equal(
      await t('browserView.staking.stakingInfo.lastReward.title')
    );
    await expect(
      (await webTester.getTextValueFromElement(stakingInfoComponent.statsLastReward().value())) as string
    ).to.match(TestnetPatterns.ADA_LITERAL_VALUE_REGEX);
  };

  assertSeeCurrentlyStakingTooltip = async () => {
    const stakingInfoComponent = new StakingInfoComponent();
    await webTester.seeWebElement(stakingInfoComponent.tooltip());
    const tooltipText = (await webTester.getTextValueFromElement(stakingInfoComponent.tooltip())) as string;
    const expectedTitle = await t('browserView.staking.stakingInfo.tooltip.title');
    await expect(tooltipText).contains(expectedTitle);
    await expect(tooltipText.replace(expectedTitle, '') as string).to.match(TestnetPatterns.USD_VALUE_NO_SUFFIX_REGEX);
  };

  assertStakingSuccessDrawer = async (process: 'Initial' | 'Switching') => {
    const stakingSuccessDrawer = new StakingSuccessDrawer();
    await webTester.seeWebElement(stakingSuccessDrawer.icon());
    await webTester.seeWebElement(stakingSuccessDrawer.button());

    await expect(await webTester.getTextValueFromElement(stakingSuccessDrawer.title())).to.equal(
      process === 'Initial'
        ? await t('browserView.staking.details.success.title')
        : await t('browserView.staking.details.switchedPools.title')
    );

    // TODO
    // blocked by bug LW-4864
    // await expect(await webTester.getTextValueFromElement(stakingSuccessDrawer.subtitle())).to.equal(
    //   process === 'Initial'
    //     ? await t('browserView.staking.details.success.subTitle')
    //     : await t('browserView.staking.details.switchedPools.subTitle')
    // );

    await expect(await webTester.getTextValueFromElement(stakingSuccessDrawer.button())).to.equal(
      await t('browserView.staking.details.fail.btn.close')
    );
  };

  assertCheckResults = async (title: string, subTitle: string, results: number) => {
    const stakePoolListItem = new StakePoolListItem();
    const rowsNumber = (await stakePoolListItem.getRows()).length;
    const resultsNum = Number(results);
    if (resultsNum === 0) {
      await expect(rowsNumber).to.equal(resultsNum);
      await webTester.waitUntilSeeElementContainingText(await t('browserView.staking.stakePoolsTable.emptyMessage'));
    } else {
      await webTester.seeWebElement(stakePoolListItem.logoWithIndex(1));
      await expect(await stakePoolListItem.getNameWithIndex(1)).to.equal(title);
      await expect(await stakePoolListItem.getTickerWithIndex(1)).to.equal(subTitle);
      if (resultsNum > 1) {
        for (let i = 2; i < resultsNum; i++) {
          await webTester.seeWebElement(stakePoolListItem.logoWithIndex(i));
          await webTester.seeWebElement(stakePoolListItem.nameWithIndex(i));
          await webTester.seeWebElement(stakePoolListItem.tickerWithIndex(i));
        }
      }
      await expect(rowsNumber).to.equal(resultsNum);
    }
  };

  assertSeeSingleSearchResult = async () => {
    await browser.waitUntil(async () => (await new StakingPage().counter.getText()) === '(1)', {
      timeout: 20_000,
      timeoutMsg: 'failed while waiting for single search result'
    });
  };

  assertSeeStakePoolRow = async (index?: number) => {
    const stakePoolListItem = new StakePoolListItem(index);
    await webTester.seeWebElement(stakePoolListItem.logo());
    await expect((await stakePoolListItem.getName()) as string).to.not.be.empty;
    await expect((await stakePoolListItem.getTicker()) as string).to.not.be.empty;
    await expect((await stakePoolListItem.getRos()) as string).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
    await expect((await stakePoolListItem.getCost()) as string).to.match(TestnetPatterns.STAKE_POOL_LIST_COST_REGEX);
    await expect((await stakePoolListItem.getSaturation()) as string).to.match(TestnetPatterns.PERCENT_DOUBLE_REGEX);
  };

  assertSeeStakePoolRows = async () => {
    const stakePoolListItem = new StakePoolListItem();
    await webTester.waitUntilSeeElement(stakePoolListItem.container(), 6000);
    const rowsNumber = (await stakePoolListItem.getRows()).length;

    for (let i = 1; i <= rowsNumber; i++) {
      await this.assertSeeStakePoolRow(i);
    }
  };

  assertStakePoolItemsOrder = async (columnName: string, order: string) => {
    const stakePoolListItem = new StakePoolListItem();
    await webTester.waitUntilSeeElement(stakePoolListItem.container(), 60_000);
    const columnContent: string[] = await StakingExtendedPageObject.extractColumnContent(columnName);
    Logger.log(`EXTRACTED DATA: ${columnContent}`);
    const sortedColumnContent = await sortColumnContent(columnContent, columnName, order);
    Logger.log(`SORTED DATA: ${sortedColumnContent}`);

    expect(columnContent).to.not.be.empty;
    expect(columnContent).to.deep.equal(sortedColumnContent);
  };

  assertSeeStakingPasswordDrawer = async () => {
    await StakingPasswordDrawer.title.waitForDisplayed();
    expect(await StakingPasswordDrawer.title.getText()).to.equal(
      await t('browserView.staking.details.confirmation.title')
    );
    await StakingPasswordDrawer.subtitle.waitForDisplayed();
    expect(await StakingPasswordDrawer.subtitle.getText()).to.equal(
      await t('browserView.transaction.send.enterWalletPasswordToConfirmTransaction')
    );
    await StakingPasswordDrawer.passwordInputContainer.waitForDisplayed();
    await StakingPasswordDrawer.confirmButton.waitForDisplayed();
    expect(await StakingPasswordDrawer.confirmButton.getText()).to.equal(await t('general.button.confirm'));
  };

  assertSeeStakingError = async () => {
    await StakingErrorDrawer.icon.waitForDisplayed();
    await StakingErrorDrawer.title.waitForDisplayed();
    expect(await StakingErrorDrawer.title.getText()).to.equal(await t('browserView.staking.details.fail.title'));
    await StakingErrorDrawer.description.waitForDisplayed();
    expect(await StakingErrorDrawer.description.getText()).to.equal(
      await t('browserView.staking.details.fail.description')
    );
    await StakingErrorDrawer.retryButton.waitForDisplayed();
    expect(await StakingErrorDrawer.retryButton.getText()).to.equal(
      await t('browserView.staking.details.fail.btn.retry')
    );
    await StakingErrorDrawer.closeButton.waitForDisplayed();
    expect(await StakingErrorDrawer.closeButton.getText()).to.equal(
      await t('browserView.staking.details.fail.btn.close')
    );
  };
}

export default new StakingPageAssert();
