import { Then, When } from '@cucumber/cucumber';
import stakingPageAssert from '../assert/stakingPageAssert';
import stakePoolDetailsAssert from '../assert/stakePoolDetailsAssert';
import stakingExtendedPageObject from '../pageobject/stakingExtendedPageObject';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import { getStakePoolById, getStakePoolByName, StakePoolsData } from '../data/expectedStakePoolsData';
import testContext from '../utils/testContext';
import transactionDetailsAssert from '../assert/transactionDetailsAssert';
import { StakePoolListItem } from '../elements/staking/StakePoolListItem';
import webTester from '../actor/webTester';
import StakingExitModalAssert from '../assert/stakingExitModalAssert';
import extensionUtils from '../utils/utils';
import stakingConfirmationScreenAssert from '../assert/stakingConfirmationScreenAssert';
import StakingPageObject from '../pageobject/stakingPageObject';
import { browser } from '@wdio/globals';

Then(/^I see Staking title and counter with total number of pools displayed$/, async () => {
  await stakingPageAssert.assertSeeTitleWithCounter();
});

Then(/^I see Staking title displayed$/, async () => {
  await stakingPageAssert.assertSeeTitle();
});

Then(/^I see the Network Info component with the expected content$/, async () => {
  await stakingPageAssert.assertNetworkContainerExistsWithContent();
});

Then(
  /^I see the stake pool search control with appropriate content in (extended|popup) mode$/,
  async (mode: 'extended' | 'popup') => {
    await stakingPageAssert.assertSeeSearchComponent(mode);
  }
);

// eslint-disable-next-line no-unused-vars
Then(
  /^I see currently staking component for stake pool: "([^"]*)" in (extended|popup) mode$/,
  // eslint-disable-next-line no-unused-vars
  async (stakePoolName: string, mode: 'extended' | 'popup') => {
    const stakePool =
      stakePoolName === 'OtherStakePool'
        ? getStakePoolByName(testContext.load(stakePoolName))
        : getStakePoolByName(stakePoolName);
    await stakingPageAssert.assertSeeCurrentlyStakingComponent(stakePool, mode);
  }
);

Then(
  /^I see currently staking component for stake pool: "([^"]*)" without metadata in (extended|popup) mode$/,
  async (stakePoolName: string, mode: 'extended' | 'popup') => {
    await stakingPageAssert.assertSeeCurrentlyStakingComponent(getStakePoolByName(stakePoolName), mode, true);
  }
);

Then(
  /^I see currently staking stake pool in (extended|popup) mode and choose new pool as "([^"]*)"$/,
  async (mode: 'extended' | 'popup', variable: string) => {
    const stakePool = getStakePoolById(await StakingPageObject.getPoolIdFromStakePoolDetails(mode));
    const isNoMetadataPool = stakePool.name === '-';
    await stakingPageAssert.assertSeeCurrentlyStakingComponent(stakePool, mode, isNoMetadataPool);

    let stakePoolDataToSave;
    if (variable === 'OtherStakePool') {
      stakePoolDataToSave =
        stakePool === StakePoolsData.adacapital ? StakePoolsData.canadaStakes.name : StakePoolsData.adacapital.name;
    } else {
      stakePoolDataToSave =
        stakePool === StakePoolsData.noMetadataPool1
          ? StakePoolsData.noMetadataPool2.poolId
          : StakePoolsData.noMetadataPool1.poolId;
    }
    testContext.save(variable, stakePoolDataToSave);
  }
);

Then(/^I see tooltip for currently staking component$/, async () => {
  await stakingPageAssert.assertSeeCurrentlyStakingTooltip();
});

Then(/^I click pool name in currently staking component$/, async () => {
  await StakingPageObject.clickPoolNameInStakingInfoComponent();
});

Then(/^(Initial|Switching) Delegation success screen is displayed$/, async (process: 'Initial' | 'Switching') => {
  await stakingPageAssert.assertStakingSuccessDrawer(process);
});

Then(/^the staking error screen is displayed$/, async () => {
  await stakingPageAssert.assertSeeStakingError();
});

When(
  /^I hover over (last reward|total staked|total rewards) in currently staking component$/,
  async (elementToHover: string) => {
    switch (elementToHover) {
      case 'last reward':
        await StakingPageObject.hoverLastRewardInStakingInfoComponent();
        break;
      case 'total staked':
        await StakingPageObject.hoverTotalStakedInStakingInfoComponent();
        break;
      case 'total rewards':
        await StakingPageObject.hoverTotalRewardsInStakingInfoComponent();
        break;
    }
  }
);

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
Then(/^I see drawer with "([^"]*)" stake pool details$/, async (_stakePool: string) => {
  const adacapital = extensionUtils.isMainnet() ? StakePoolsData.adacapitalMainnet : StakePoolsData.adacapital;
  await stakePoolDetailsAssert.assertSeeStakePoolDetailsPage(adacapital, true);
});

Then(/^I wait until current stake pool switch to "([^"]*)"$/, async (stakePoolName: string) => {
  const stakePool =
    stakePoolName === 'OtherStakePool'
      ? getStakePoolByName(testContext.load(stakePoolName))
      : getStakePoolByName(stakePoolName);
  await stakingPageAssert.assertStakePoolSwitched(stakePool.name);
});

Then(
  /^I see drawer with "([^"]*)" stake pool details and a button available for staking$/,
  async (stakePoolName: string) => {
    const stakePool =
      stakePoolName === 'OtherStakePool'
        ? getStakePoolByName(testContext.load(stakePoolName))
        : getStakePoolByName(stakePoolName, extensionUtils.isMainnet() ? 'mainnet' : 'testnet');
    await stakePoolDetailsAssert.assertSeeStakePoolDetailsPage(stakePool, false);
  }
);

Then(/^I see drawer with stake pool details without metadata and a button available for staking$/, async () => {
  await stakePoolDetailsAssert.assertSeeStakePoolDetailsPage(
    getStakePoolById(testContext.load('OtherNoMetadataStakePool')),
    false,
    true
  );
});

Then(/^I input "([^"]*)" to the search bar$/, async (term: string) => {
  await (term === 'OtherStakePool' || term === 'OtherNoMetadataStakePool'
    ? StakingPageObject.fillSearch(testContext.load(term))
    : StakingPageObject.fillSearch(term));
  await browser.pause(2000); // wait some time to get results
});

Then(
  /^there are (.*) results and "([^"]*)" and "([^"]*)" are populated if applicable$/,
  async (results: number, resultTitle: string, resultSubTitle: string) => {
    await browser.pause(3000); // wait some time to get results
    await stakingPageAssert.assertCheckResults(resultTitle, resultSubTitle, results);
  }
);

When(/^I click stake pool with name "([^"]*)"$/, async (poolName: string) => {
  poolName === 'OtherStakePool'
    ? await StakingPageObject.clickStakePoolWithName(testContext.load(poolName))
    : await StakingPageObject.clickStakePoolWithName(poolName);
});

Then(/^the stakepool drawer is opened with "([^"]*)" stake pool information$/, async (poolName: string) => {
  await drawerCommonExtendedAssert.assertSeeDrawerWithTitle(poolName);
});

When(/^I click on the "(.*)" column header$/, async (listHeader: string) => {
  const stakePoolListItem = new StakePoolListItem();
  await webTester.waitUntilSeeElement(stakePoolListItem.container(), 60_000);
  await stakingExtendedPageObject.clickStakePoolListHeader(listHeader);
});

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
Then(/^Each stake pool list item contains:$/, async (_ignored: string) => {
  await stakingPageAssert.assertSeeStakePoolRows();
});

Then(/^The Tx details are displayed for Staking (with|without) metadata$/, async (metadata: 'with' | 'without') => {
  const expectedTransactionDetails =
    metadata === 'with'
      ? {
          transactionDescription: 'Delegation\n1 token',
          status: 'Success',
          poolName: testContext.load('poolName') as string,
          poolTicker: testContext.load('poolTicker') as string,
          poolID: testContext.load('poolID') as string
        }
      : {
          transactionDescription: 'Delegation\n1 token',
          status: 'Success',
          poolID: testContext.load('poolID') as string
        };

  await transactionDetailsAssert.assertSeeTransactionDetails(expectedTransactionDetails);
});

Then(
  /^the results are in (ascending|descending) order according to "([^"]*)" column$/,
  async (order: 'ascending' | 'descending', column: string) => {
    await stakingPageAssert.assertStakePoolItemsOrder(column, order);
  }
);

When(/^I reveal all stake pools$/, async () => {
  await webTester.waitUntilSeeElement(new StakePoolListItem().container(), 60_000);
  await stakingExtendedPageObject.revealAllStakePools();
});

When(/^I save stakepool info$/, async () => {
  await stakingExtendedPageObject.saveStakePoolInfo();
});

Then(/^Staking password screen is displayed$/, async () => {
  await stakingPageAssert.assertSeeStakingPasswordDrawer();
});

Then(/^Staking exit modal (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  shouldBeDisplayed === 'is'
    ? await StakingExitModalAssert.assertSeeStakingExitModal()
    : await StakingExitModalAssert.assertDontSeeStakingExitModal();
});

Then(
  /^I see drawer with stakepool: "([^"]*)" confirmation screen in (extended|popup) mode$/,
  async (stakePoolName: string, mode: 'extended' | 'popup') => {
    const adaBalance = testContext.load('tADAtokenBalance') as string;
    const stakePool =
      stakePoolName === 'OtherStakePool'
        ? getStakePoolByName(testContext.load(stakePoolName))
        : getStakePoolByName(stakePoolName, extensionUtils.isMainnet() ? 'mainnet' : 'testnet');
    await stakingConfirmationScreenAssert.assertSeeStakePoolConfirmationScreen(mode, stakePool, adaBalance);
  }
);

When(/^I wait for single search result$/, async () => {
  await stakingPageAssert.assertSeeSingleSearchResult();
});
