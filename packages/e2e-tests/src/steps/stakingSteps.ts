import { Then } from '@cucumber/cucumber';
import stakingPageAssert from '../assert/stakingPageAssert';
import stakePoolDetailsAssert from '../assert/stakePoolDetailsAssert';
import { getStakePoolById, getStakePoolByName, StakePoolsData } from '../data/expectedStakePoolsData';
import testContext from '../utils/testContext';
import transactionDetailsAssert, { ExpectedActivityDetails } from '../assert/transactionDetailsAssert';
import extensionUtils from '../utils/utils';
import stakingConfirmationScreenAssert from '../assert/stakingConfirmationScreenAssert';
import StakingPageObject from '../pageobject/stakingPageObject';

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
