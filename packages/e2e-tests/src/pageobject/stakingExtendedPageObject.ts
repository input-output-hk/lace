import webTester from '../actor/webTester';
import StakingPage from '../elements/staking/stakingPage';
import { StakePoolListItem } from '../elements/staking/StakePoolListItem';
import testContext from '../utils/testContext';
import StakePoolDetails from '../elements/staking/stakePoolDetails';

class StakingExtendedPageObject {
  async clickStakePoolListHeader(listHeader: string) {
    await StakingPage.stakingPoolListColumnHeader(listHeader).scrollIntoView();
    await StakingPage.stakingPoolListColumnHeader(listHeader).click();
  }

  async revealAllStakePools(): Promise<void> {
    const stakePoolListItem = new StakePoolListItem();
    await webTester.waitUntilSeeElement(stakePoolListItem.container(), 6000);

    const expectedTotalRows = Number((await StakingPage.counter.getText()).replace(/\D/g, ''));
    let displayedRows = (await stakePoolListItem.getRows()).length;

    while (displayedRows < expectedTotalRows) {
      await $(new StakePoolListItem(displayedRows).toJSLocator()).scrollIntoView();
      displayedRows = (await stakePoolListItem.getRows()).length;
    }
  }

  async extractColumnContent(columnName: string): Promise<string[]> {
    const rowsNumber = (await new StakePoolListItem().getRows()).length;
    const columnContent: string[] = [];
    for (let i = 1; i <= rowsNumber; i++) {
      const listItem = new StakePoolListItem(i);
      switch (columnName) {
        case 'name':
          columnContent.push((await listItem.getName()) as string);
          break;
        case 'ros':
          columnContent.push((await listItem.getRos()) as string);
          break;
        case 'cost':
          columnContent.push((await listItem.getCost()) as string);
          break;
        case 'saturation':
          columnContent.push((await listItem.getSaturation()) as string);
          break;
      }
    }

    return columnContent;
  }

  saveStakePoolInfo = async () => {
    const poolName = (await StakePoolDetails.poolName.getText()) as string;
    testContext.save('poolName', poolName);
    const poolTicker = (await StakePoolDetails.poolTicker.getText()) as string;
    testContext.save('poolTicker', poolTicker);
    const poolID = (await StakePoolDetails.poolId.getText()) as string;
    testContext.save('poolID', poolID);
  };
}

export default new StakingExtendedPageObject();
