import CommonDrawerElements from '../CommonDrawerElements';

class StakingManageDrawer extends CommonDrawerElements {
  // TODO: add remaining elements
  private NEXT_BUTTON = '[data-testid="preferences-next-button"]';
  private DELEGATION_INFO_CARD = '[data-testid="delegation-info-card"]';
  private DELEGATION_SELECTED_POOLS_LABEL = '[data-testid="manage-delegation-selected-pools-label"]';
  private DELEGATION_ADD_POOLS_BUTTON = '[data-testid="manage-delegation-add-pools-btn"]';

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get infoCard() {
    return $(this.DELEGATION_INFO_CARD);
  }

  get selectedPoolsLabel() {
    return $(this.DELEGATION_SELECTED_POOLS_LABEL);
  }

  get addPoolsButton() {
    return $(this.DELEGATION_ADD_POOLS_BUTTON);
  }
}

export default new StakingManageDrawer();
