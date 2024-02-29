import CommonGovernanceActionPageElements from './CommonGovernanceActionPageElements';

class ConfirmDRepUpdatePage extends CommonGovernanceActionPageElements {
  private URL_LABEL = '[data-testid="metadata-url-label"]';
  private URL_VALUE = '[data-testid="metadata-url-value"]';
  private HASH_LABEL = '[data-testid="metadata-hash-label"]';
  private HASH_VALUE = '[data-testid="metadata-hash-value"]';
  private DREP_ID_LABEL = '[data-testid="metadata-DRepID-label"]';
  private DREP_ID_VALUE = '[data-testid="metadata-DRepID-value"]';

  get urlLabel() {
    return $(this.URL_LABEL);
  }

  get urlValue() {
    return $(this.URL_VALUE);
  }

  get hashLabel() {
    return $(this.HASH_LABEL);
  }

  get hashValue() {
    return $(this.HASH_VALUE);
  }

  get dRepIdLabel() {
    return $(this.DREP_ID_LABEL);
  }

  get dRepIdValue() {
    return $(this.DREP_ID_VALUE);
  }
}

export default new ConfirmDRepUpdatePage();
