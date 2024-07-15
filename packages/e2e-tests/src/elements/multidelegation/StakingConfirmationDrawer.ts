/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseElement } from 'webdriverio';

class StakingConfirmationDrawer extends CommonDrawerElements {
  // TODO: add remaining elements
  private NEXT_BUTTON = '[data-testid="stake-pool-confirmation-btn"]';
  private TITLE = '[data-testid="staking-confirmation-title"]';
  private SUBTITLE = '[data-testid="staking-confirmation-subtitle"]';
  private DELEGATE_FROM_CONTAINER = '[data-testid="sp-confirmation-delegate-from-container"]';
  private DELEGATE_TO_CONTAINER = '[data-testid="sp-confirmation-delegate-to-container"]';
  private TRANSACTION_COST_TITLE = '[data-testid="transaction-cost-title"]';
  private TRANSACTION_FEE_LABEL = '[data-testid="sp-confirmation-staking-fee-label"]';

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get delegateFrom(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATE_FROM_CONTAINER);
  }

  get delegateTo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DELEGATE_TO_CONTAINER);
  }

  get transactionCostTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_COST_TITLE);
  }

  get transactionFeeLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_LABEL);
  }
}

export default new StakingConfirmationDrawer();
