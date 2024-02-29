/* eslint-disable no-undef */
import CommonDappPageElements from '../dappConnector/commonDappPageElements';

class CommonGovernanceActionPageElements extends CommonDappPageElements {
  private CANCEL_BUTTON = '[data-testid="dapp-transaction-cancel"]';
  private CONFIRM_BUTTON = '[data-testid="dapp-transaction-confirm"]';
  private METADATA_LABEL = '[data-testid="metadata-label"]';

  get metadataLabel(): ChainablePromiseElement {
    return $(this.METADATA_LABEL);
  }

  get cancelButton(): ChainablePromiseElement {
    return $(this.CANCEL_BUTTON);
  }

  get confirmButton(): ChainablePromiseElement {
    return $(this.CONFIRM_BUTTON);
  }

  async clickButton(button: 'Cancel' | 'Confirm'): Promise<void> {
    if (button === 'Cancel') {
      await this.cancelButton.waitForClickable();
      await this.cancelButton.click();
    } else {
      await this.confirmButton.waitForClickable();
      await this.confirmButton.click();
    }
  }
}

export default CommonGovernanceActionPageElements;
