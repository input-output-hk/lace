import { DataTable, Given, Then, When } from '@cucumber/cucumber';
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
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import StakingPasswordDrawer from '../elements/multidelegation/StakingPasswordDrawer';
import StakingSuccessDrawerAssert from '../assert/multidelegation/StakingSuccessDrawerAssert';
import StakingSuccessDrawer from '../elements/multidelegation/StakingSuccessDrawer';
import StakingPasswordDrawerAssert from '../assert/multidelegation/StakingPasswordDrawerAssert';
import StakingConfirmationDrawerAssert from '../assert/multidelegation/StakingConfirmationDrawerAssert';
import StakingInfoComponent from '../elements/staking/stakingInfoComponent';
import ManageStakingDrawerAssert from '../assert/multidelegation/ManageStakingDrawerAssert';
import StartStakingPageAssert from '../assert/multidelegation/StartStakingPageAssert';
import TokensPage from '../elements/tokensPage';
import localStorageInitializer from '../fixture/localStorageInitializer';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import StartStakingPage from '../elements/multidelegation/StartStakingPage';
import PortfolioBar from '../elements/multidelegation/PortfolioBar';
import PortfolioBarAssert from '../assert/multidelegation/PortfolioBarAssert';
import ChangingStakingPreferencesModalAssert from '../assert/multidelegation/ChangingStakingPreferencesModalAssert';
import { StakePoolListColumnName, StakePoolSortingOptionType } from '../types/staking';
import SwitchingStakePoolModal from '../elements/multidelegation/SwitchingStakePoolModal';
import MoreOptionsComponentAssert from '../assert/multidelegation/MoreOptionsComponentAssert';
import { mapColumnNameStringToEnum, mapSortingOptionNameStringToEnum } from '../utils/stakePoolListContent';
import { browser } from '@wdio/globals';
import { StakePoolSortingOption } from '../enums/StakePoolSortingOption';
import MultidelegationDAppIssueModal from '../elements/multidelegation/MultidelegationDAppIssueModal';
import StakingInfoCard from '../elements/multidelegation/StakingInfoCard';
import StakingExitModal from '../elements/multidelegation/StakingExitModal';
import StakingExitModalAssert from '../assert/multidelegation/StakingExitModalAssert';
import StakingErrorDrawerAssert from '../assert/multidelegation/StakingErrorDrawerAssert';
import MultidelegationDAppIssueModalAssert from '../assert/multidelegation/MultidelegationDAppIssueModalAssert';
import { StakePoolGridCard } from '../elements/multidelegation/StakePoolGridCard';
import { StakePoolListItem } from '../elements/multidelegation/StakePoolListItem';
import SwitchingPoolsModalAssert from '../assert/multidelegation/SwitchingPoolsModalAssert';
import { clearInputFieldValue } from '../utils/inputFieldUtils';

const validPassword = 'N_8J@bne87A';

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
  await clearInputFieldValue(await MultidelegationPage.stakingPageSearchInput);
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

Then(
  /^I see stake pool details drawer for "([^"]*)" stake pool opened from currently staked component$/,
  async (stakePoolName: string) => {
    const network = extensionUtils.isMainnet() ? 'mainnet' : 'testnet';
    const stakePool = getStakePoolByName(stakePoolName, network);
    await StakePoolDetailsAssert.assertSeeStakePoolDetailsPage(stakePool, true, false, true);
  }
);

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
        password = validPassword;
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

When(/^I save stake pool details$/, async () => {
  await StakePoolDetailsDrawer.saveStakePoolDetails();
});

Then(/^I see the Network Info component with the expected content$/, async () => {
  await MultidelegationPageAssert.assertNetworkContainerExistsWithContent();
});

Then(/^I see the stake pool search control with appropriate content$/, async () => {
  await MultidelegationPageAssert.assertSeeSearchComponent();
});

Then(
  /^there are (\d+) stake pools returned for (grid|list) view$/,
  async (resultsCount: number, viewType: 'grid' | 'list') => {
    await MultidelegationPageAssert.assertSeeSearchResults(resultsCount, viewType);
  }
);

Then(/^\(if applicable\) first stake pool search result has "([^"]*)" ticker$/, async (expectedTicker: string) => {
  if ((await MultidelegationPage.displayedPools.length) > 0) {
    await MultidelegationPageAssert.assertSeeFirstSearchResultWithTicker(expectedTicker);
  }
});

When(
  /^I hover over "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Pledge|Live Stake)" column name in stake pool list$/,
  async (columnName: StakePoolListColumnName) => {
    await MultidelegationPage.hoverOverColumn(mapColumnNameStringToEnum(columnName));
  }
);

Then(
  /^tooltip for "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Pledge|Live Stake)" column is displayed$/,
  async (columnName: StakePoolListColumnName) => {
    await MultidelegationPageAssert.assertSeeTooltipForColumn(mapColumnNameStringToEnum(columnName));
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
  const cardanoBalance = String(await TokensPage.loadTokenBalance('Cardano'));
  await StartStakingPageAssert.assertSeeStartStakingPage(cardanoBalance, mode);
});

Given(/^I am on Start Staking page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await TokensPage.waitUntilCardanoTokenLoaded();
  await TokensPage.saveTokenBalance('Cardano');
  await localStorageInitializer.disableShowingMultidelegationBetaBanner();
  await localStorageInitializer.disableShowingMultidelegationPersistenceBanner();
  await mainMenuPageObject.navigateToSection('Staking', mode);
  const cardanoBalance = String(await TokensPage.loadTokenBalance('Cardano'));
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
  await browser.pause(1000);
  if (await SwitchingStakePoolModal.title.isDisplayed()) {
    await SwitchingStakePoolModal.fineByMeButton.click();
  }
});

Then(/^I see Expanded View banner$/, async () => {
  await StartStakingPageAssert.assertSeeExpandedViewBanner();
});

When(/^I switch to (grid|list) view on "Browse pools" tab$/, async (viewType: 'grid' | 'list') => {
  await MultidelegationPage.switchPoolsView(viewType);
});

Then(/^stake pool list row skeleton (is|is not) displayed$/, async (status: 'is' | 'is not') => {
  await MultidelegationPageAssert.assertSeeStakePoolListRowSkeleton(status === 'is');
});

Then(/^stake pool grid card skeleton (is|is not) displayed$/, async (status: 'is' | 'is not') => {
  await MultidelegationPageAssert.assertSeeStakePoolGridCardSkeleton(status === 'is');
});

Then(/^stake pool (grid|list) view is displayed$/, async (view: 'grid' | 'list') => {
  await MultidelegationPageAssert.assertSeeStakePoolViewType(view);
});

When(/^I select (\d+) stake pools from (grid|list) view$/, async (numberOfPools: number, viewType: 'grid' | 'list') => {
  await MultidelegationPage.selectPoolsForDelegation(Number(numberOfPools), viewType);
});

When(/^I save tickers of selected pools in (grid|list) view$/, async (viewType: 'grid' | 'list') => {
  await MultidelegationPage.saveTickers(viewType);
});

Then(/^previously selected pools are still selected in (grid|list) view$/, async (viewType: 'grid' | 'list') => {
  await MultidelegationPageAssert.assertSeePreviouslySelectedStakePools(viewType);
});

Then(/^I see (\d+) stake pool cards in a row$/, async (cardsCount: number) => {
  await MultidelegationPageAssert.assertsSeeCardsInARow(Number(cardsCount));
});

When(
  /^I click on stake pools table "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Pledge|Live Stake)" column header$/,
  async (headerName: StakePoolListColumnName) => {
    await MultidelegationPage.clickOnColumn(mapColumnNameStringToEnum(headerName));
  }
);

When(
  /^I hover over "(Ticker|Saturation|ROS|Cost|Margin|Produced blocks|Pledge|Live Stake)" sorting option from "More options" component$/,
  async (sortingOption: StakePoolSortingOptionType) => {
    await MultidelegationPage.moreOptionsComponent.hoverOverSortingOption(
      mapSortingOptionNameStringToEnum(sortingOption)
    );
  }
);

Then(
  /^tooltip for "(Ticker|Saturation|ROS|Cost|Margin|Produced blocks|Pledge|Live Stake)" sorting option is displayed$/,
  async (sortingOption: StakePoolSortingOptionType) => {
    await MultidelegationPageAssert.assertSeeTooltipForSortingOption(mapSortingOptionNameStringToEnum(sortingOption));
  }
);

When(
  /^I select "(Ticker|Saturation|ROS|Cost|Margin|Produced blocks|Pledge|Live Stake)" sorting option from "More options" component$/,
  async (sortingOption: StakePoolSortingOptionType) => {
    await MultidelegationPage.moreOptionsComponent.selectSortingOption(mapSortingOptionNameStringToEnum(sortingOption));
  }
);

Then(
  /^"More options" component with stake pool (sorting|filtering) options is displayed$/,
  async (tab: 'sorting' | 'filtering') => {
    await MoreOptionsComponentAssert.assertSeeMoreOptionsComponent(tab);
  }
);

Then(
  /^(ascending|descending) sorting indicator is displayed for "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Pledge|Live Stake)" column$/,
  async (order: 'ascending' | 'descending', sortingOption: StakePoolListColumnName) => {
    await MultidelegationPageAssert.assertSeeColumnSortingIndicator(sortingOption, order);
  }
);

Then(
  /^stake pool (list rows|cards) are sorted by "(Ticker|Saturation|ROS|Cost|Margin|Blocks|Produced blocks|Pledge|Live Stake)" in (ascending|descending) order$/,
  async (
    stakePoolsDisplayType: 'list rows' | 'cards',
    sortingOption: StakePoolSortingOptionType | 'Blocks', // Different label used on column header and on "More options" component
    order: 'ascending' | 'descending'
  ) => {
    const poolLimit = 100; // Limit verification to 100 stake pools due to time constraints
    await MultidelegationPageAssert.assertSeeStakePoolsSorted(
      stakePoolsDisplayType,
      sortingOption === 'Blocks'
        ? StakePoolSortingOption.ProducedBlocks
        : mapSortingOptionNameStringToEnum(sortingOption),
      order,
      poolLimit
    );
  }
);

When(
  /^I select (ascending|descending) order for "(Ticker|Saturation|ROS|Cost|Margin|Produced blocks|Pledge|Live Stake)" sorting option$/,
  async (order: 'ascending' | 'descending', sortingOption: StakePoolSortingOptionType) => {
    const isOptionAlreadySelected = await (
      await MultidelegationPage.moreOptionsComponent.getSortingOptionOrderButton(
        mapSortingOptionNameStringToEnum(sortingOption),
        order
      )
    ).isDisplayed();
    if (!isOptionAlreadySelected) {
      await MultidelegationPage.moreOptionsComponent.clickOnOrderButtonForSortingOption(
        order === 'ascending' ? 'descending' : 'ascending', // look for button with reversed state
        mapSortingOptionNameStringToEnum(sortingOption)
      );
    }
  }
);

Then(
  /^order button is displayed for "(Ticker|Saturation|ROS|Cost|Margin|Produced blocks|Pledge|Live Stake)" sorting option in (ascending|descending) state$/,
  async (sortingOption: StakePoolSortingOptionType, order: 'ascending' | 'descending') => {
    await MultidelegationPageAssert.assertSeeSortingOptionOrderButton(
      mapSortingOptionNameStringToEnum(sortingOption),
      order
    );
  }
);

When(/^I click on "Got it" button inside the modal about issues with multi-delegation and DApps$/, async () => {
  await MultidelegationDAppIssueModal.clickOnGotItButton();
});

When(/^I click on a random stake pool from the (grid|list)$/, async (mode: 'grid' | 'list') => {
  if (mode === 'grid') {
    const randomCardIndex = await MultidelegationPage.getRandomStakePooGridCardIndex();
    await new StakePoolGridCard(randomCardIndex).container.click();
  } else {
    const randomItemIndex = await MultidelegationPage.getRandomStakePoolListItemIndex();
    await new StakePoolListItem(randomItemIndex).container.click();
  }
});

Then(
  /^I (see|do not see) the modal about issues with multi-delegation and DApps$/,
  async (status: 'see' | 'do not see') => {
    await MultidelegationDAppIssueModalAssert.assertSeeModal(status === 'see');
  }
);

When(/^I reset default behaviour for modal about issues with multi-delegation and DApps$/, async () => {
  await localStorageInitializer.removeConfigurationForShowingMultidelegationDAppsIssueModal();
  await browser.refresh();
});

Then(/^I see currently staking component for stake pool:$/, async (stakePools: DataTable) => {
  for (const row of stakePools.hashes()) {
    await MultidelegationPageAssert.assertSeeCurrentlyStakingComponent(
      Number(row.position),
      row.poolName,
      row.poolTickerOrId,
      Boolean(row.hasMetadata)
    );
  }
});

When(/^I click on pool name in the first currently staking component$/, async () => {
  await new StakingInfoCard(1).clickOnPoolName();
});

Then(
  /^I click "(Cancel|Exit)" button for staking "You'll have to start again" modal$/,
  async (button: 'Cancel' | 'Exit') => {
    switch (button) {
      case 'Cancel':
        await StakingExitModal.cancelButton.waitForClickable();
        await StakingExitModal.cancelButton.click();
        break;
      case 'Exit':
        await StakingExitModal.exitButton.waitForClickable();
        await StakingExitModal.exitButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(/^Staking exit modal (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  shouldBeDisplayed === 'is'
    ? await StakingExitModalAssert.assertSeeStakingExitModal()
    : await StakingExitModalAssert.assertDontSeeStakingExitModal();
});

When(/^I click "(Cancel|Fine by me)" button on "Switching pool\?" modal$/, async (button: 'Cancel' | 'Fine by me') => {
  switch (button) {
    case 'Cancel':
      await SwitchingStakePoolModal.cancelButton.waitForClickable();
      await SwitchingStakePoolModal.cancelButton.click();
      break;
    case 'Fine by me':
      await SwitchingStakePoolModal.fineByMeButton.waitForClickable();
      await SwitchingStakePoolModal.fineByMeButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^the staking error screen is displayed$/, async () => {
  await StakingErrorDrawerAssert.assertSeeStakingError();
});

Then(/^I see "Switching to less pools" modal$/, async () => {
  await SwitchingPoolsModalAssert.assertSeeSwitchingToLessPoolsModal();
});
