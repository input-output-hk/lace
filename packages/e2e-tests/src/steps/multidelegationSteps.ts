import { Given, Then, When } from '@cucumber/cucumber';
import MultidelegationPageAssert from '../assert/multidelegation/MultidelegationPageAssert';
import MultidelegationPage from '../elements/multidelegation/MultidelegationPage';
import { parseSearchTerm } from '../utils/multiDelegationUtils';
import testContext from '../utils/testContext';
import { getStakePoolByName } from '../data/expectedStakePoolsData';
import extensionUtils from '../utils/utils';
import stakePoolDetailsAssert from '../assert/multidelegation/StakePoolDetailsAssert';
import StakePoolDetails from '../elements/multidelegation/StakePoolDetailsDrawer';
import ChangingStakingPreferencesModal from '../elements/multidelegation/ChangingStakingPreferencesModal';
import ManageStakingDrawer from '../elements/multidelegation/ManageStakingDrawer';
import StakingConfirmationDrawer from '../elements/multidelegation/StakingConfirmationDrawer';

Given(/^I click (Overview|Browse pools) tab$/, async (tabToClick: 'Overview' | 'Browse pools') => {
  await MultidelegationPage.clickOnTab(tabToClick);
});

Then(/^I wait until delegation info card shows staking to "(\d+)" pool\(s\)$/, async (poolsCount: number) => {
  await MultidelegationPageAssert.assertSeeStakingOnPoolsCounter(poolsCount);
});

Then(
  /^I pick "(\d+)" pools for delegation from browse pools view: "([^"]*)"$/,
  async (_ignored: number, poolsToStake: string) => {
    await MultidelegationPage.markPoolsForDelegation(poolsToStake);
  }
);

Then(/^I click "Next" button on staking (portfolio bar|manage staking|confirmation)$/, async (section: string) => {
  await MultidelegationPage.clickButtonOnSection(section);
});
Given(/^I confirm multidelegation beta modal$/, async () => {
  await MultidelegationPage.confirmBetaModal();
});

Then(/^I see Delegation card displaying correct data$/, async () => {
  await MultidelegationPageAssert.assertSeeDelegationCardDetailsInfo();
});

Then(/^I see Delegation title displayed for multidelegation$/, async () => {
  await MultidelegationPageAssert.assertSeeTitle();
});

Then(/^I see Delegation pool cards are displayed for popup view$/, async () => {
  await MultidelegationPageAssert.assertSeeDelegatedPoolCardsPopup();
});

When(/^I save identifiers of stake pools currently in use$/, async () => {
  await MultidelegationPage.saveIDsOfStakePoolsInUse();
});

When(/^I input "([^"]*)" into stake pool search bar$/, async (term: string) => {
  const searchTerm = await parseSearchTerm(term);
  await MultidelegationPage.fillSearch(searchTerm);
  await MultidelegationPage.searchLoader.waitForDisplayed({ reverse: true, timeout: 10_000 });
  testContext.save('currentStakePoolName', searchTerm);
});

When(/^I click on the stake pool with name "([^"]*)"$/, async (poolName: string) => {
  poolName = poolName === 'OtherStakePool' ? testContext.load('currentStakePoolName') : poolName;
  await MultidelegationPage.clickOnStakePoolWithName(poolName);
});

Then(/^I see stake pool details drawer for "([^"]*)" stake pool$/, async (stakePoolName: string) => {
  const stakePool =
    stakePoolName === 'OtherStakePool'
      ? getStakePoolByName(testContext.load('currentStakePoolName'))
      : getStakePoolByName(stakePoolName, extensionUtils.isMainnet() ? 'mainnet' : 'testnet');
  await stakePoolDetailsAssert.assertSeeStakePoolDetailsPage(stakePool, false);
});

When(
  /^I click on "(Stake all on this pool|Select pool for multi-staking)" button on stake pool details drawer$/,
  async (button: 'Stake all on this pool' | 'Select pool for multi-staking') => {
    switch (button) {
      case 'Select pool for multi-staking':
        await StakePoolDetails.selectPoolForMultiStakingButton.waitForClickable();
        await StakePoolDetails.selectPoolForMultiStakingButton.click();
        break;
      case 'Stake all on this pool':
        await StakePoolDetails.stakeAllOnThisPoolButton.waitForClickable();
        await StakePoolDetails.stakeAllOnThisPoolButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(
  /^I click "(Cancel|Fine by me)" button on "Changing staking preferences\?" modal$/,
  async (button: 'Cancel' | 'Fine by me') => {
    switch (button) {
      case 'Cancel':
        await ChangingStakingPreferencesModal.cancelButton.waitForClickable();
        await ChangingStakingPreferencesModal.cancelButton.click();
        break;
      case 'Fine by me':
        await ChangingStakingPreferencesModal.fineByMeButton.waitForClickable();
        await ChangingStakingPreferencesModal.fineByMeButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(/^I click on "Next" button on staking preferences drawer$/, async () => {
  await ManageStakingDrawer.nextButton.waitForClickable();
  await ManageStakingDrawer.nextButton.click();
});

When(/^I click on "Next" button on staking confirmation drawer$/, async () => {
  await StakingConfirmationDrawer.nextButton.waitForClickable();
  await StakingConfirmationDrawer.nextButton.click();
});
