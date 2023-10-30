import CommonDrawerElements from '../CommonDrawerElements';

class StakingConfirmationDrawer extends CommonDrawerElements {
  // TODO: add remaining elements
  private NEXT_BUTTON = '[data-testid="stake-pool-confirmation-btn"]';
  private TITLE = '[data-testid="staking-confirmation-title"]';
  private SUBTITLE = '[data-testid="staking-confirmation-subtitle"]';
  private DELEGATE_FROM_CONTAINER = '[data-testid="sp-confirmation-delegate-from-container"]';
  private DELEGATE_TO_CONTAINER = '[data-testid="sp-confirmation-delegate-to-container"]';
  private TRANSACTION_COST_TITLE = '[data-testid="transaction-cost-title"]';
  private TRANSACTION_FEE_LABEL = '[data-testid="sp-confirmation-staking-fee-label"]';

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }

  get title() {
    return $(this.TITLE);
  }

  get subtitle() {
    return $(this.SUBTITLE);
  }

  get delegateFrom() {
    return $(this.DELEGATE_FROM_CONTAINER);
  }

  get delegateTo() {
    return $(this.DELEGATE_TO_CONTAINER);
  }

  get transactionCostTitle() {
    return $(this.TRANSACTION_COST_TITLE);
  }

  get transactionFeeLabel() {
    return $(this.TRANSACTION_FEE_LABEL);
  }
}

export default new StakingConfirmationDrawer();
