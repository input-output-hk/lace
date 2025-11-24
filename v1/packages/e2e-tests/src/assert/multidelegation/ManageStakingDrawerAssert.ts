import { expect } from 'chai';
import { t } from '../../utils/translationService';
import ManageStakingDrawer from '../../elements/multidelegation/ManageStakingDrawer';
import MultidelegationPage from '../../elements/multidelegation/MultidelegationPage';

class ManageStakingDrawerAssert {
  assertSeeManageStakingDrawer = async (manageButtonInitiated = false) => {
    await ManageStakingDrawer.drawerHeaderCloseButton.waitForClickable();
    await ManageStakingDrawer.drawerNavigationTitle.waitForDisplayed();
    expect(await ManageStakingDrawer.drawerNavigationTitle.getText()).to.equal(
      await t('drawer.titleSecond', 'staking')
    );
    await this.assertSeeInfoCard();
    await ManageStakingDrawer.selectedPoolsLabel.waitForDisplayed();
    await ManageStakingDrawer.addPoolsButton.waitForDisplayed();
    if (!manageButtonInitiated) {
      await ManageStakingDrawer.nextButton.waitForDisplayed();
      expect(await ManageStakingDrawer.nextButton.getText()).to.equal(
        await t('drawer.preferences.confirmButton', 'staking')
      );
    }
  };

  assertSeeInfoCard = async () => {
    await ManageStakingDrawer.delegationCardStatusLabel.waitForDisplayed();
    await ManageStakingDrawer.delegationCardStatusValue.waitForDisplayed();
    await ManageStakingDrawer.delegationCardBalanceLabel.waitForDisplayed();
    await ManageStakingDrawer.delegationCardBalanceValue.waitForDisplayed();
    await ManageStakingDrawer.delegationCardPoolsLabel.waitForDisplayed();
    await ManageStakingDrawer.delegationCardPoolsValue.waitForDisplayed();
    expect(await ManageStakingDrawer.delegationCardChartSlices.length).to.be.greaterThan(0);
  };

  assertSeeOnlyFirstPoolDetailsExpanded = async () => {
    await ManageStakingDrawer.infoCard.waitForDisplayed();
    await ManageStakingDrawer.infoCard.waitForStable();
    expect(await ManageStakingDrawer.poolDetailsIconExpanded.length).to.equal(1);
    await this.assertSeePoolDetails(0);
  };

  assertSeePoolDetails = async (poolIndex: number) => {
    await ManageStakingDrawer.poolDetailsName[poolIndex].waitForClickable();
    await ManageStakingDrawer.poolDetailsIconExpanded[poolIndex].waitForClickable();
    await ManageStakingDrawer.poolDetailsSavedRatioTitle(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsSavedRatioValue(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsSavedRatioTooltipIcon(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsActualRatioTitle(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsActualRatioValue(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsActualRatioTooltipIcon(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsActualStakeTitle(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsActualStakeValue(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsActualStakeTooltipIcon(poolIndex).waitForClickable();
    await ManageStakingDrawer.poolDetailsSavedRatioTooltipIcon(poolIndex).moveTo();
    await ManageStakingDrawer.tooltip(0).waitForClickable();
    expect(await ManageStakingDrawer.tooltip(0).getText()).to.equal(
      await t('drawer.preferences.poolDetails.savedRatioTooltip', 'staking')
    );
    await ManageStakingDrawer.poolDetailsActualRatioTooltipIcon(poolIndex).moveTo();
    await ManageStakingDrawer.tooltip(1).waitForClickable();
    expect(await ManageStakingDrawer.tooltip(1).getText()).to.equal(
      await t('drawer.preferences.poolDetails.actualRatioTooltip', 'staking')
    );
    await ManageStakingDrawer.poolDetailsActualStakeTooltipIcon(poolIndex).moveTo();
    await ManageStakingDrawer.tooltip(2).waitForClickable();
    expect(await ManageStakingDrawer.tooltip(2).getText()).to.equal(
      await t('drawer.preferences.poolDetails.actualStakeTooltip', 'staking')
    );
    expect(await ManageStakingDrawer.poolDetailsEditRatioTitle(poolIndex).getText()).to.not.be.empty;
    expect(await ManageStakingDrawer.poolDetailsRatioTitle(poolIndex).getText()).to.not.be.empty;
    expect(Number(await ManageStakingDrawer.poolDetailsRatioInput(poolIndex).getValue()))
      .to.be.below(101)
      .and.above(0);
    expect(await ManageStakingDrawer.poolDetailsRatioPercentSign(poolIndex).getText()).to.equal('%');
    await ManageStakingDrawer.poolDetailsSliderMinus(0).waitForClickable();
    await ManageStakingDrawer.poolDetailsSlider(0).waitForClickable();
    await ManageStakingDrawer.poolDetailsSliderPlus(0).waitForClickable();
    await ManageStakingDrawer.poolDetailsRemovePoolButton(0).waitForDisplayed();
  };

  assertSeeAllPoolsDetailsExpanded = async () => {
    expect(await ManageStakingDrawer.poolDetailsIconTruncated.length).to.equal(0);
    expect(await ManageStakingDrawer.poolDetailsIconExpanded.length).to.equal(
      Number(await MultidelegationPage.delegationCardPoolsValue.getText())
    );
  };

  assertSeeAllPoolsDetailsHidden = async () => {
    expect(await ManageStakingDrawer.poolDetailsIconExpanded.length).to.equal(0);
    expect(await ManageStakingDrawer.poolDetailsIconTruncated.length).to.equal(
      Number(await MultidelegationPage.delegationCardPoolsValue.getText())
    );
  };

  assertSeeSelectedPoolsCounter = async (poolsCount: number) => {
    let selectedPoolsCounter = await ManageStakingDrawer.selectedPoolsLabel.getText();
    selectedPoolsCounter = selectedPoolsCounter.split('(')[1].replace(')', '');
    expect(Number(selectedPoolsCounter)).to.equal(Number(poolsCount));
    expect(Number(await ManageStakingDrawer.delegationCardPoolsValue.getText())).to.equal(Number(selectedPoolsCounter));
  };

  assertSeeAddStakePoolButtonDisabled = async (shouldBeEnabled: boolean) => {
    await ManageStakingDrawer.addPoolsButton.waitForClickable({
      reverse: !shouldBeEnabled
    });
  };

  assertSeeRemovePoolButtonDisabled = async (shouldBeEnabled: boolean, poolNo: number) => {
    await ManageStakingDrawer.poolDetailsRemovePoolButton(poolNo - 1).waitForEnabled({
      reverse: !shouldBeEnabled
    });
  };

  assertSeeRemovePoolButtonTooltip = async (tooltipForPool: number) => {
    await ManageStakingDrawer.tooltip(tooltipForPool - 1).waitForDisplayed();
    expect(await ManageStakingDrawer.tooltip(tooltipForPool - 1).getText()).to.equal(
      await t('drawer.preferences.pickMorePools', 'staking')
    );
  };

  assertSeeConfirmNewPortfolioButton = async (shouldBeVisible: boolean) => {
    await ManageStakingDrawer.nextButton.waitForDisplayed({
      reverse: !shouldBeVisible
    });
    if (shouldBeVisible)
      expect(await ManageStakingDrawer.nextButton.getText()).to.equal(
        await t('drawer.preferences.confirmButton', 'staking')
      );
  };

  assertConfirmNewPortfolioButtonState = async (isEnabled: boolean) => {
    await ManageStakingDrawer.nextButton.waitForEnabled({
      reverse: !isEnabled
    });
  };

  assertSeeDelegationCardStatus = async (
    status: 'Simple delegation' | 'Multi delegation' | 'Under allocated' | 'Over allocated'
  ) => {
    let expectedCopy;
    switch (status) {
      case 'Simple delegation':
        expectedCopy = await t('overview.delegationCard.statuses.simpleDelegation', 'staking');
        break;
      case 'Multi delegation':
        expectedCopy = await t('overview.delegationCard.statuses.multiDelegation', 'staking');
        break;
      case 'Under allocated':
        expectedCopy = await t('overview.delegationCard.statuses.underAllocated', 'staking');
        break;
      case 'Over allocated':
        expectedCopy = await t('overview.delegationCard.statuses.overAllocated', 'staking');
        break;
      default:
        throw new Error('Invalid status');
    }
    expect(await ManageStakingDrawer.delegationCardStatusValue.getText()).to.equal(expectedCopy);
  };

  assertSeeRatioForPool = async (ratio: number, poolNo: number) => {
    expect(Number(await ManageStakingDrawer.poolDetailsRatioInput(poolNo - 1).getValue())).to.equal(ratio);
  };
}

export default new ManageStakingDrawerAssert();
