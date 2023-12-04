import CommonGovernanceActionPageElements from './CommonGovernanceActionPageElements';

class ConfirmVoteDelegationPage extends CommonGovernanceActionPageElements {
  private DREP_ID_LABEL = '[data-testid="metadata-DRepID-label"]';
  private DREP_ID_VALUE = '[data-testid="metadata-DRepID-value"]';
  private ABSTAIN_LABEL = '[data-testid="metadata-alwaysAbstain-label"]';
  private ABSTAIN_VALUE = '[data-testid="metadata-alwaysAbstain-value"]';
  private NO_CONFIDENCE_LABEL = '[data-testid="metadata-alwaysNoConfidence-label"]';
  private NO_CONFIDENCE_VALUE = '[data-testid="metadata-alwaysNoConfidence-value"]';

  get dRepIdLabel() {
    return $(this.DREP_ID_LABEL);
  }

  get dRepIdValue() {
    return $(this.DREP_ID_VALUE);
  }

  get abstainLabel() {
    return $(this.ABSTAIN_LABEL);
  }

  get abstainValue() {
    return $(this.ABSTAIN_VALUE);
  }

  get noConfidenceLabel() {
    return $(this.NO_CONFIDENCE_LABEL);
  }

  get noConfidenceValue() {
    return $(this.NO_CONFIDENCE_VALUE);
  }
}

export default new ConfirmVoteDelegationPage();
