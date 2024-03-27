/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';

class TransactionSummaryPage extends CommonDrawerElements {
  private BUNDLE_ROW = '//div[@data-testid="bundle-summary-row"]';
  private BUNDLE_ROW_TITLE = '//span[@data-testid="bundle-summary-title"]';
  private RECIPIENT_ADDRESS_LABEL = '//p[@data-testid="output-summary-recipient-title-label"]';
  private RECIPIENT_ADDRESS_VALUE = '//span[@data-testid="output-summary-recipient-address"]';
  private SENDING_TITLE = '//p[@data-testid="output-summary-sending-title-label"]';
  private ASSET_INFO_CONTAINER = '//div[@data-testid="asset-info"]';
  private ASSET_INFO_VALUE = '//span[@data-testid="asset-info-amount"]';
  private ASSET_INFO_FIAT = '//span[@data-testid="asset-info-amount-fiat"]';
  private METADATA_CONTAINER = '//div[@data-testid="metadata-container"]';
  private METADATA_LABEL = '[data-testid="metadata-label"]';
  private METADATA_VALUE = '[data-testid="metadata-value"]';
  private FEE_CONTAINER = '//div[@data-testid="summary-fee-container"]';
  private TRANSACTION_FEE_LABEL = '[data-testid="summary-fee-label"]';
  private CANCEL_BUTTON = '[data-testid="send-cancel-btn"]';
  private CONFIRM_BUTTON = '[data-testid="send-next-btn"]';

  bundleRowTitle(bundleIndex = 1) {
    return $(`${this.BUNDLE_ROW}[${bundleIndex}]${this.BUNDLE_ROW_TITLE}`);
  }

  sendingTitle(bundleIndex = 1) {
    return $(`${this.BUNDLE_ROW}[${bundleIndex}]${this.SENDING_TITLE}`);
  }

  sendingValueAda(bundleIndex = 1, assetRowIndex = 1) {
    return $(
      `${this.BUNDLE_ROW}[${bundleIndex}]${this.ASSET_INFO_CONTAINER}[${assetRowIndex}]${this.ASSET_INFO_VALUE}`
    );
  }

  sendingValueFiat(bundleIndex = 1, assetRowIndex = 1) {
    return $(`${this.BUNDLE_ROW}[${bundleIndex}]${this.ASSET_INFO_CONTAINER}[${assetRowIndex}]${this.ASSET_INFO_FIAT}`);
  }

  recipientAddressLabel(bundleIndex = 1) {
    return $(`${this.BUNDLE_ROW}[${bundleIndex}]${this.RECIPIENT_ADDRESS_LABEL}`);
  }

  recipientAddressValue(bundleIndex = 1) {
    return $(`${this.BUNDLE_ROW}[${bundleIndex}]${this.RECIPIENT_ADDRESS_VALUE}`);
  }

  get transactionFeeLabel() {
    return $(this.TRANSACTION_FEE_LABEL);
  }

  get transactionFeeValueAda() {
    return $(`${this.FEE_CONTAINER}${this.ASSET_INFO_VALUE}`);
  }

  get transactionFeeValueFiat() {
    return $(`${this.FEE_CONTAINER}${this.ASSET_INFO_FIAT}`);
  }

  get metadataTitle() {
    return $(`${this.METADATA_CONTAINER}${this.METADATA_LABEL}`);
  }

  get metadataValue() {
    return $(`${this.METADATA_CONTAINER}${this.METADATA_VALUE}`);
  }

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  async saveFeeValue() {
    const [feeValue] = (await this.transactionFeeValueAda.getText()).split(' ');
    testContext.save('feeValue', feeValue);
  }
}

export default new TransactionSummaryPage();
