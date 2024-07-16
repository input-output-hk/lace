import { Then, When } from '@cucumber/cucumber';
import stakingPageAssert from '../assert/stakingPageAssert';
import stakePoolDetailsAssert from '../assert/stakePoolDetailsAssert';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import { getStakePoolById, getStakePoolByName, StakePoolsData } from '../data/expectedStakePoolsData';
import testContext from '../utils/testContext';
import transactionDetailsAssert, { ExpectedActivityDetails } from '../assert/transactionDetailsAssert';
import extensionUtils from '../utils/utils';
import stakingConfirmationScreenAssert from '../assert/stakingConfirmationScreenAssert';
import StakingPageObject from '../pageobject/stakingPageObject';
import StakingConfirmationDrawer from '../elements/staking/stakingConfirmationDrawer';

Then(
  /^I see currently staking component for stake pool: "([^"]*)" in (extended|popup) mode$/,
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
        stakePool === StakePoolsData.adaocean ? StakePoolsData.canadaStakes.name : StakePoolsData.adaocean.name;
    } else {
      stakePoolDataToSave =
        stakePool === StakePoolsData.noMetadataPool1
          ? StakePoolsData.noMetadataPool2.poolId
          : StakePoolsData.noMetadataPool1.poolId;
    }
    testContext.save(variable, stakePoolDataToSave);
  }
);

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
Then(/^I see drawer with "([^"]*)" stake pool details$/, async (_stakePool: string) => {
  const adacapital = extensionUtils.isMainnet() ? StakePoolsData.adacapitalMainnet : StakePoolsData.adaocean;
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
    let stakePool;
    if (stakePoolName === 'OtherStakePool') {
      stakePool = getStakePoolByName(testContext.load(stakePoolName));
    } else {
      const network = extensionUtils.isMainnet() ? 'mainnet' : 'testnet';
      stakePool = getStakePoolByName(stakePoolName, network);
    }
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

Then(/^the stakepool drawer is opened with "([^"]*)" stake pool information$/, async (poolName: string) => {
  await drawerCommonExtendedAssert.assertSeeDrawerWithTitle(poolName);
});

// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
Then(/^The Tx details are displayed for Staking (with|without) metadata$/, async (_ignored: 'with' | 'without') => {
  // no need to distinguish between pools with/without metadata
  // all information is saved in testContext/stakePoolsInUse
  const expectedActivityDetails: ExpectedActivityDetails = {
    transactionDescription: 'Delegation\n1 token',
    status: 'Success',
    poolData: testContext.load('stakePoolsInUse')
  };

  await transactionDetailsAssert.assertSeeActivityDetails(expectedActivityDetails);
});

Then(
  /^I see drawer with stakepool: "([^"]*)" confirmation screen in (extended|popup) mode$/,
  async (stakePoolName: string, mode: 'extended' | 'popup') => {
    const adaBalance = String(testContext.load('tADAtokenBalance'));
    let stakePool;
    if (stakePoolName === 'OtherStakePool') {
      stakePool = getStakePoolByName(testContext.load(stakePoolName));
    } else {
      const network = extensionUtils.isMainnet() ? 'mainnet' : 'testnet';
      stakePool = getStakePoolByName(stakePoolName, network);
    }
    await stakingConfirmationScreenAssert.assertSeeStakePoolConfirmationScreen(mode, stakePool, adaBalance);
  }
);

When(/^I wait for single search result$/, async () => {
  await stakingPageAssert.assertSeeSingleSearchResult();
});

When(/^I click "Next" button on staking confirmation drawer$/, async () => {
  await StakingConfirmationDrawer.nextButton.waitForClickable({ timeout: 15_000 });
  await StakingConfirmationDrawer.nextButton.click();
});

Then(
  /^"Next" button is (enabled|disabled) on "Staking confirmation" page$/,
  async (isButtonEnabled: 'enabled' | 'disabled') => {
    await stakingConfirmationScreenAssert.assertSeeNextButtonEnabled(isButtonEnabled === 'enabled');
  }
);

Then(/^I see (ADA|tADA) in current staked pool$/, async (expectedTicker: 'ADA' | 'tADA') => {
  await stakingPageAssert.assertSeeTickerInCurrentStakedPool(expectedTicker);
});
