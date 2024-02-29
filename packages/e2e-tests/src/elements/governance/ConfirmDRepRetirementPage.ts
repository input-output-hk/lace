import CommonGovernanceActionPageElements from './CommonGovernanceActionPageElements';

class ConfirmDRepRetirementPage extends CommonGovernanceActionPageElements {
  private ERROR_PANE = '[data-testid="error-pane"]';
  private DREP_ID_LABEL = '[data-testid="metadata-DRepID-label"]';
  private DREP_ID_VALUE = '[data-testid="metadata-DRepID-value"]';
  private DEPOSIT_RETURNED_LABEL = '[data-testid="metadata-depositReturned-label"]';
  private DEPOSIT_RETURNED_VALUE = '[data-testid="metadata-depositReturned-value"]';

  get errorPane() {
    return $(this.ERROR_PANE);
  }

  get dRepIdLabel() {
    return $(this.DREP_ID_LABEL);
  }

  get dRepIdValue() {
    return $(this.DREP_ID_VALUE);
  }

  get depositReturnedLabel() {
    return $(this.DEPOSIT_RETURNED_LABEL);
  }

  get depositReturnedValue() {
    return $(this.DEPOSIT_RETURNED_VALUE);
  }
}

export default new ConfirmDRepRetirementPage();
