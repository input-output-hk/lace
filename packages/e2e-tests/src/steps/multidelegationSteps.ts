import { Given, Then, When } from '@cucumber/cucumber';
import MultiDelegationBetaModal from '../elements/multidelegation/MultiDelegationBetaModal';
import MultidelegationPageAssert from '../assert/multidelegation/MultidelegationPageAssert';
import MultidelegationPage from '../elements/multidelegation/MultidelegationPage';
import { parseSearchTerm } from '../utils/multiDelegationUtils';
import testContext from '../utils/testContext';
import { getStakePoolById, getStakePoolByName, getStakePoolByTicker } from '../data/expectedStakePoolsData';
import extensionUtils from '../utils/utils';
import StakePoolDetailsAssert from '../assert/multidelegation/StakePoolDetailsAssert';
import StakePoolDetailsDrawer from '../elements/multidelegation/StakePoolDetailsDrawer';
import ChangingStakingPreferencesModal from '../elements/multidelegation/ChangingStakingPreferencesModal';
import ManageStakingDrawer from '../elements/multidelegation/ManageStakingDrawer';
import StakingConfirmationDrawer from '../elements/multidelegation/StakingConfirmationDrawer';
import { getTestWallet, TestWalletName, WalletConfig } from '../support/walletConfiguration';
import StakingPasswordDrawer from '../elements/multidelegation/StakingPasswordDrawer';
import StakingSuccessDrawerAssert from '../assert/multidelegation/StakingSuccessDrawerAssert';
import StakingSuccessDrawer from '../elements/multidelegation/StakingSuccessDrawer';
import transactionDetailsAssert from '../assert/transactionDetailsAssert';
import StakingPasswordDrawerAssert from '../assert/multidelegation/StakingPasswordDrawerAssert';
import StakingConfirmationDrawerAssert from '../assert/multidelegation/StakingConfirmationDrawerAssert';
import StakingInfoComponent from '../elements/staking/stakingInfoComponent';
import ManageStakingDrawerAssert from '../assert/multidelegation/ManageStakingDrawerAssert';
import StartStakingPageAssert from '../assert/multidelegation/StartStakingPageAssert';
import TokensPageObject from '../pageobject/tokensPageObject';
import localStorageInitializer from '../fixture/localStorageInitializer';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import StartStakingPage from '../elements/multidelegation/StartStakingPage';
import PortfolioBar from '../elements/multidelegation/PortfolioBar';
import PortfolioBarAssert from '../assert/multidelegation/PortfolioBarAssert';
import ChangingStakingPreferencesModalAssert from '../assert/multidelegation/ChangingStakingPreferencesModalAssert';
import { StakePoolListColumnType } from '../types/staking';
import SwitchingStakePoolModal from '../elements/staking/SwitchingStakePoolModal';

Given(/^I open (Overview|Browse pools) tab$/, async (tabToClick: 'Overview' | 'Browse pools') => {
  await MultidelegationPage.openTab(tabToClick);
});

When(/^I close Multi-delegation beta modal$/, async () => {
  await MultiDelegationBetaModal.clickGoItButton();
});

Then(/^I wait until delegation info card shows staking to "(\d+)" pool\(s\)$/, async (poolsCount: number) => {
  await MultidelegationPageAssert.assertSeeStakingOnPoolsCounter(poolsCount);
});

When(/^I wait until "([^"]*)" pool is on "Your pools" list$/, async (poolName: string) => {
  poolName = poolName === 'OtherStakePool' ? testContext.load('poolName') : poolName;
  await MultidelegationPageAssert.assertSeeStakingPoolOnYourPoolsList(poolName);
});

Then(
  /^I pick "(\d+)" pools for delegation from browse pools view: "([^"]*)"$/,
  async (_ignored: number, poolsToStake: string) => {
    await MultidelegationPage.markPoolsForDelegation(poolsToStake);
  }
);

Then(
  /^I see "(\d+)" stake pool details buttons for (delegated|non-delegated) pool$/,
  async (numberOfButtons: number, typeOfPool: 'delegated' | 'non-delegated') => {
    await StakePoolDetailsAssert.assertSeeDrawerButtons(typeOfPool === 'delegated', numberOfButtons);
  }
);

Then(/^I click "Next" button on staking (manage staking|confirmation)$/, async (section: string) => {
  await MultidelegationPage.clickNextButtonOnDrawerSection(section);
});

Then(/^I click "(Next|Clear)" button on staking portfolio bar$/, async (button: 'Next' | 'Clear') => {
  switch (button) {
    case 'Next':
      await PortfolioBar.clickNextButton();
      break;
    case 'Clear':
      await PortfolioBar.clickNextButton();
      break;
    default:
      throw new Error(`Unsupported button: ${button}`);
  }
});

When(/^I see portfolio bar with "([^"]*)" selected pools$/, async (selectedPools: string) => {
  await PortfolioBarAssert.assertSeePortfolioBar(selectedPools);
});

Then(/^I see Changing Staking Preferences modal$/, async () => {
  await ChangingStakingPreferencesModalAssert.assertSeeModal();
});
Then(/^I see Delegation card displaying correct data$/, async () => {
  await MultidelegationPageAssert.assertSeeDelegationCardDetailsInfo();
});

Then(/^I see Delegation title displayed for multidelegation$/, async () => {
  await MultidelegationPageAssert.assertSeeTitle();
});

Then(/^I see Delegation pool cards are displayed$/, async () => {
  await MultidelegationPageAssert.assertSeeDelegatedPoolCards();
});

When(/^I save identifiers of stake pools currently in use$/, async () => {
  await MultidelegationPage.saveIDsOfStakePoolsInUse();
});

When(/^I input "([^"]*)" into stake pool search bar$/, async (term: string) => {
  const searchTerm = await parseSearchTerm(term);
  await MultidelegationPage.fillSearch(searchTerm);
  await MultidelegationPage.searchLoader.waitForDisplayed({ reverse: true, timeout: 10_000 });
});

When(/^I click on the stake pool with ticker "([^"]*)"$/, async (poolTicker: string) => {
  poolTicker = poolTicker === 'OtherStakePool' ? testContext.load('currentStakePoolTicker') : poolTicker;
  await MultidelegationPage.clickOnStakePoolWithTicker(poolTicker);
});

Then(/^I see stake pool details drawer for "([^"]*)" stake pool$/, async (stakePoolName: string) => {
  let stakePool;
  if (stakePoolName === 'OtherStakePool') {
    stakePool = testContext.has('currentStakePoolName')
      ? getStakePoolByName(testContext.load('currentStakePoolName'))
      : getStakePoolByTicker(testContext.load('currentStakePoolTicker'));
  } else {
    const network = extensionUtils.isMainnet() ? 'mainnet' : 'testnet';
    stakePool = getStakePoolByName(stakePoolName, network);
  }
  await StakePoolDetailsAssert.assertSeeStakePoolDetailsPage(stakePool, false);
});

Then(/^I see stake pool details drawer for stake pool without metadata$/, async () => {
  const stakePool = getStakePoolById(testContext.load('currentStakePoolId'));
  await StakePoolDetailsAssert.assertSeeStakePoolDetailsPage(stakePool, false, true);
});

When(
  /^I click on "(Stake all on this pool|Select pool for multi-staking|Manage delegation)" button on stake pool details drawer$/,
  async (button: 'Stake all on this pool' | 'Select pool for multi-staking' | 'Manage delegation') => {
    switch (button) {
      case 'Select pool for multi-staking':
        await StakePoolDetailsDrawer.selectPoolForMultiStakingButton.waitForClickable();
        await StakePoolDetailsDrawer.selectPoolForMultiStakingButton.click();
        break;
      case 'Stake all on this pool':
        await StakePoolDetailsDrawer.stakeAllOnThisPoolButton.waitForClickable();
        await StakePoolDetailsDrawer.stakeAllOnThisPoolButton.click();
        break;
      case 'Manage delegation':
        await StakePoolDetailsDrawer.manageDelegationButton.waitForClickable();
        await StakePoolDetailsDrawer.manageDelegationButton.click();
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
  await StakingConfirmationDrawer.nextButton.waitForClickable({ timeout: 120_000 });
  await StakingConfirmationDrawer.nextButton.click();
});

When(
  /^I enter (correct|incorrect|newly created) wallet password and confirm staking$/,
  async (type: 'correct' | 'incorrect' | 'newly created') => {
    let password;
    switch (type) {
      case 'newly created':
        password = String((testContext.load('newCreatedWallet') as WalletConfig).password);
        break;
      case 'incorrect':
        password = 'somePassword';
        break;
      case 'correct':
      default:
        password = String(getTestWallet(TestWalletName.TestAutomationWallet).password);
    }
    await StakingPasswordDrawer.fillPassword(password);
    await StakingPasswordDrawer.confirmStaking();
  }
);

Then(/^(Initial|Switching) staking success drawer is displayed$/, async (process: 'Initial' | 'Switching') => {
  await StakingSuccessDrawerAssert.assertSeeStakingSuccessDrawer(process);
});

Then(/^I click "Close" button on staking success drawer$/, async () => {
  await StakingSuccessDrawer.clickCloseButton();
});

Then(
  /^the transaction details are displayed for staking (with|without) metadata$/,
  async (metadata: 'with' | 'without') => {
    const expectedActivityDetails =
      metadata === 'with'
        ? {
            transactionDescription: 'Delegation\n1 token',
            status: 'Success',
            poolName: String(testContext.load('poolName')),
            poolTicker: String(testContext.load('poolTicker')),
            poolID: String(testContext.load('poolID'))
          }
        : {
            transactionDescription: 'Delegation\n1 token',
            status: 'Success',
            poolID: String(testContext.load('poolID'))
          };

    await transactionDetailsAssert.assertSeeActivityDetails(expectedActivityDetails);
  }
);

When(/^I save stake pool details$/, async () => {
  await StakePoolDetailsDrawer.saveStakePoolDetails();
});

Then(/^I see the Network Info component with the expected content$/, async () => {
  await MultidelegationPageAssert.assertNetworkContainerExistsWithContent();
});

Then(/^I see the stake pool search control with appropriate content$/, async () => {
  await MultidelegationPageAssert.assertSeeSearchComponent();
});

Then(/^there are (\d+) stake pools returned$/, async (resultsCount: number) => {
  await MultidelegationPageAssert.assertSeeSearchResults(resultsCount);
});

Then(/^\(if applicable\) first stake pool search result has "([^"]*)" ticker$/, async (expectedTicker: string) => {
  if ((await MultidelegationPage.displayedPools.length) > 0) {
    await MultidelegationPageAssert.assertSeeFirstSearchResultWithTicker(expectedTicker);
  }
});

When(
  /^I hover over "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Pledge|Live stake)" column name in stake pool list$/,
  async (columnName: StakePoolListColumnType) => {
    await MultidelegationPage.hoverOverColumnWithName(columnName);
  }
);

Then(
  /^tooltip for "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Pledge|Live stake)" column is displayed$/,
  async (columnName: StakePoolListColumnType) => {
    await MultidelegationPageAssert.assertSeeTooltipForColumn(columnName);
  }
);

Then(/^staking password drawer is displayed$/, async () => {
  await StakingPasswordDrawerAssert.assertSeeStakingPasswordDrawer();
});

Then(/^Stake pool details drawer (is|is not) opened$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await StakePoolDetailsAssert.assertStakePoolDetailsDrawerIsDisplayed(shouldBeDisplayed === 'is');
});

When(/^I'm on a delegation flow "([^"]*)"$/, async (delegationStep: string) => {
  const password = String(getTestWallet(TestWalletName.TestAutomationWallet).password);
  const manageStaking = 'manage staking';

  switch (delegationStep) {
    case 'success':
      await MultidelegationPage.clickNextButtonOnDrawerSection(manageStaking);
      await MultidelegationPage.clickNextButtonOnDrawerSection('confirmation');
      await StakingPasswordDrawer.fillPassword(password);
      await StakingPasswordDrawer.confirmStaking();
      await StakingSuccessDrawerAssert.assertSeeStakingSuccessDrawer('Switching');
      break;
    case 'password':
      await MultidelegationPage.clickNextButtonOnDrawerSection(manageStaking);
      await MultidelegationPage.clickNextButtonOnDrawerSection('confirmation');
      await StakingPasswordDrawerAssert.assertSeeStakingPasswordDrawer();
      break;
    case 'confirmation':
      await MultidelegationPage.clickNextButtonOnDrawerSection(manageStaking);
      await StakingConfirmationDrawerAssert.assertSeeStakingConfirmationDrawer();
      break;
    case 'manage':
      await ManageStakingDrawerAssert.assertSeeManageStakingDrawer();
      break;
  }
});

When(
  /^I hover over (last reward|total staked|total rewards) in currently staking component$/,
  async (elementToHover: string) => {
    switch (elementToHover) {
      case 'last reward':
        await StakingInfoComponent.hoverOverLastRewardValue();
        break;
      case 'total staked':
        await StakingInfoComponent.hoverOverTotalStakedValue();
        break;
      case 'total rewards':
        await StakingInfoComponent.hoverOverTotalRewardsValue();
        break;
      default:
        throw new Error(`Unsupported element: ${elementToHover}`);
    }
  }
);

When(/^I click on the stake pool title: "([^"]*)" in currently staking component$/, async (poolName: string) => {
  await StakingInfoComponent.container.waitForDisplayed();
  await StakingInfoComponent.clickPoolName(poolName);
});

Then(/^I see tooltip for element in currently staking component$/, async () => {
  await MultidelegationPageAssert.assertSeeCurrentlyStakingTooltip();
});

Then(/^I see Start Staking page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  const cardanoBalance = String(await TokensPageObject.loadTokenBalance('Cardano'));
  await StartStakingPageAssert.assertSeeStartStakingPage(cardanoBalance, mode);
});

Given(/^I am on Start Staking page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await TokensPageObject.waitUntilCardanoTokenLoaded();
  await TokensPageObject.saveTokenBalance('Cardano');
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationPersistenceBanner();
  await mainMenuPageObject.navigateToSection('Staking', mode);
  const cardanoBalance = String(await TokensPageObject.loadTokenBalance('Cardano'));
  await StartStakingPageAssert.assertSeeStartStakingPage(cardanoBalance, mode);
});

Then(/^I click "Get Started" step ([12]) link$/, async (linkNumber: '1' | '2') => {
  await (linkNumber === '1'
    ? StartStakingPage.clickGetStartedStep1Link()
    : StartStakingPage.clickGetStartedStep2Link());
});

Given(/^I click "Expand view" on Start Staking page$/, async () => {
  await StartStakingPage.clickExpandedViewBannerButton();
});

When(/^I wait for stake pool list to be populated$/, async () => {
  await MultidelegationPage.waitForStakePoolListToLoad();
});

Then(
  /^each stake pool list item contains: checkbox, ticker, saturation, ROS, cost, margin, blocks, pledge and live stake$/,
  async () => {
    await MultidelegationPageAssert.assertSeeStakePoolRows();
  }
);

When(/^I click Manage button$/, async () => {
  await MultidelegationPage.clickManageButton();
});

Then(/^I see Manage delegation drawer$/, async () => {
  await ManageStakingDrawerAssert.assertSeeManageStakingDrawer(true);
});

Then(/^I see only first pools details are expanded$/, async () => {
  await ManageStakingDrawerAssert.assertSeeOnlyFirstPoolDetailsExpanded();
});

Then(/^I expand all pools details$/, async () => {
  await ManageStakingDrawer.expandAllPoolsDetails();
});

Then(/^all pools details are expanded$/, async () => {
  await ManageStakingDrawerAssert.assertSeeAllPoolsDetailsExpanded();
});

When(/^I hide all pools details$/, async () => {
  await ManageStakingDrawer.hideAllPoolsDetails();
});

Then(/^all pools details are hidden$/, async () => {
  await ManageStakingDrawerAssert.assertSeeAllPoolsDetailsHidden();
});

Then(/^I see selected pools counter is showing "([^"]*)"$/, async (poolsCount: number) => {
  await ManageStakingDrawerAssert.assertSeeSelectedPoolsCounter(poolsCount);
});

Then(/^I see "Add stake pool" button is (disabled|enabled)$/, async (state: 'enabled' | 'disabled') => {
  await ManageStakingDrawerAssert.assertSeeAddStakePoolButtonDisabled(state === 'enabled');
});

Then(/^I click "Add stake pool" button$/, async () => {
  await ManageStakingDrawer.clickAddStakePoolButton();
});

Then(/^I pick "([^"]*)" pool for delegation$/, async (poolTicker: string) => {
  await MultidelegationPage.markPoolsForDelegation(poolTicker);
});

Given(
  /^I see "Remove pool from portfolio" button is (disabled|enabled) for pool "([^"]*)"$/,
  async (state: 'enabled' | 'disabled', poolNo: number) => {
    await ManageStakingDrawerAssert.assertSeeRemovePoolButtonDisabled(state === 'enabled', poolNo);
  }
);

Given(/^I remove "(\d+)" pools from delegation portfolio$/, async (poolsToRemove: number) => {
  await ManageStakingDrawer.removePoolsFromDelegationPortfolio(poolsToRemove);
});

Given(
  /^I see "Remove pool from portfolio" button tooltip on hover for pool "(\d*)"$/,
  async (tooltipForPool: number) => {
    await ManageStakingDrawer.hoverOverRemovePoolButtonForPool(tooltipForPool);
    await ManageStakingDrawerAssert.assertSeeRemovePoolButtonTooltip(tooltipForPool);
  }
);

Then(/^I (see|don't see) "Confirm new portfolio" button$/, async (visible: 'see' | 'dont see') => {
  await ManageStakingDrawerAssert.assertSeeConfirmNewPortfolioButton(visible === 'see');
});

Then(/^"Confirm new portfolio" button is (enabled|disabled)$/, async (isEnabled: 'enabled' | 'disabled') => {
  await ManageStakingDrawerAssert.assertConfirmNewPortfolioButtonState(isEnabled === 'enabled');
});

When(/^I click (plus|minus) button for pool "(\d+)"$/, async (ratioButton: 'plus' | 'minus', poolNo: number) => {
  await ManageStakingDrawer.clickRatioButtonForPool(ratioButton, poolNo);
});

When(/^I click "Confirm new portfolio" button$/, async () => {
  await ManageStakingDrawer.clickConfirmNewPortfolioButton();
});

Then(/^I see Manage delegation drawer Confirmation page$/, async () => {
  await StakingConfirmationDrawerAssert.assertSeeStakingConfirmationDrawer();
});

Then(
  /^I see "(Simple delegation|Multi delegation|Under allocated|Over allocated)" status in delegation card$/,
  async (status: 'Simple delegation' | 'Multi delegation' | 'Under allocated' | 'Over allocated') => {
    await ManageStakingDrawerAssert.assertSeeDelegationCardStatus(status);
  }
);

When(/^I input random ratio for (\d+) pools adding to 100%$/, async (poolsCount: number) => {
  await ManageStakingDrawer.inputRandomRatiosForPools(poolsCount);
});

When(/^I input (\d+)% ratio for pool (\d+)$/, async (ratio: number, poolNo: number) => {
  await ManageStakingDrawer.inputRatioForPool(ratio, poolNo);
});

Then(/^I see input ratio field showing (\d+)% for pool (\d+)$/, async (ratio: number, poolNo: number) => {
  await ManageStakingDrawerAssert.assertSeeRatioForPool(ratio, poolNo);
});

When(/^\(if applicable\) I close "Switching pools\?" modal$/, async () => {
  if (await SwitchingStakePoolModal.title.isDisplayed()) {
    await SwitchingStakePoolModal.fineByMeButton.click();
  }
});

Then(/^I see Expanded View banner$/, async () => {
  await StartStakingPageAssert.assertSeeExpandedViewBanner();
});
