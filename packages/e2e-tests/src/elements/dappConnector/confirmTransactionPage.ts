/* eslint-disable no-undef */
import CommonDappPageElements from './commonDappPageElements';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { getTextFromElementArray } from '../../utils/getTextFromArray';

class ConfirmTransactionPage extends CommonDappPageElements {
  private TRANSACTION_TYPE_TITLE = '[data-testid="dapp-transaction-title"]';
  private TRANSACTION_TYPE = '[data-testid="dapp-transaction-type"]';
  private TRANSACTION_SUMMARY_ROW = '[data-testid="dapp-transaction-summary-row"]';
  private TRANSACTION_FROM_ROW = '[data-testid="dapp-transaction-from-row"]';
  private TRANSACTION_TO_ROW = '[data-testid="dapp-transaction-to-row"]';
  private TRANSACTION_ORIGIN = '[data-testid="dapp-transaction-origin"]';
  private TRANSACTION_ORIGIN_LABEL = '[data-testid="dapp-transaction-origin-expander"] [data-testid="expander-title"]';
  private TRANSACTION_ORIGIN_EXPANDER_BUTTON =
    '[data-testid="dapp-transaction-origin-expander"] [data-testid="expander-button"]';
  private TRANSACTION_RETURNED_DEPOSIT_TITLE = '[data-testid="tx-amount-returned-deposit-label"]';
  private TRANSACTION_RETURNED_DEPOSIT_ADA = '[data-testid="tx-amount-returned-deposit-amount"]';
  private TRANSACTION_DEPOSIT_TITLE = '[data-testid="tx-amount-deposit-label"]';
  private TRANSACTION_DEPOSIT_ADA = '[data-testid="tx-amount-deposit-amount"]';
  private TRANSACTION_FEE_TITLE = '[data-testid="tx-amount-fee-label"]';
  private TRANSACTION_FEE_ADA = '[data-testid="tx-amount-fee-amount"]';
  private TRANSACTION_TO_SECTION_EXPANDER_BUTTON =
    '[data-testid="dapp-transaction-to-section-expander"] [data-testid="expander-button"]';
  private TRANSACTION_TO_SECTION_EXPANDER_LABEL =
    '[data-testid="dapp-transaction-to-section-expander"] [data-testid="expander-title"]';
  private TRANSACTION_FROM_SECTION_EXPANDER_BUTTON =
    '[data-testid="dapp-transaction-from-section-expander"] [data-testid="expander-button"]';
  private TRANSACTION_FROM_SECTION_EXPANDER_LABEL =
    '[data-testid="dapp-transaction-from-section-expander"] [data-testid="expander-title"]';
  private CONFIRM_BUTTON = '[data-testid="dapp-transaction-confirm"]';
  private CANCEL_BUTTON = '[data-testid="dapp-transaction-cancel"]';
  private ADDRESS_TAG_FROM_SECTION =
    '[data-testid="dapp-transaction-from-section-expander"] [data-testid="address-tag"]';
  private ADDRESS_TAG_TO_SECTION = '[data-testid="dapp-transaction-to-section-expander"] [data-testid="address-tag"]';

  get transactionOrigin() {
    return $(this.TRANSACTION_ORIGIN);
  }

  get transactionOriginLabel() {
    return $(this.TRANSACTION_ORIGIN_LABEL);
  }

  get transactionFeeTitle() {
    return $(this.TRANSACTION_FEE_TITLE);
  }

  get transactionFeeValueAda() {
    return $(this.TRANSACTION_FEE_ADA);
  }

  get transactionDepositTitle() {
    return $(this.TRANSACTION_DEPOSIT_TITLE);
  }

  get transactionDepositValueAda() {
    return $(this.TRANSACTION_DEPOSIT_ADA);
  }

  get transactionReturnedDepositValueAda() {
    return $(this.TRANSACTION_RETURNED_DEPOSIT_ADA);
  }

  get transactionReturnedDepositTitle() {
    return $(this.TRANSACTION_RETURNED_DEPOSIT_TITLE);
  }

  get transactionTypeTitle() {
    return $(this.TRANSACTION_TYPE_TITLE);
  }

  get transactionType() {
    return $(this.TRANSACTION_TYPE);
  }

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  get transactionToSectionExpanderButton() {
    return $(this.TRANSACTION_TO_SECTION_EXPANDER_BUTTON);
  }

  get transactionToSectionExpanderLabel() {
    return $(this.TRANSACTION_TO_SECTION_EXPANDER_LABEL);
  }

  get transactionFromSectionExpanderButton() {
    return $(this.TRANSACTION_FROM_SECTION_EXPANDER_BUTTON);
  }

  get transactionFromSectionExpanderLabel() {
    return $(this.TRANSACTION_FROM_SECTION_EXPANDER_LABEL);
  }

  get transactionOriginSectionExpanderButton() {
    return $(this.TRANSACTION_ORIGIN_EXPANDER_BUTTON);
  }

  get transactionSummaryAssetsRows(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_SUMMARY_ROW);
  }

  get transactionFromAssetsRows(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_FROM_ROW);
  }

  get transactionToAssetsRows(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_TO_ROW);
  }

  get addressTagToSection() {
    return $(this.ADDRESS_TAG_TO_SECTION);
  }

  get addressTagFromSection() {
    return $(this.ADDRESS_TAG_FROM_SECTION);
  }

  async getAssetsFromAddressSection() {
    const textArray = await getTextFromElementArray(await this.transactionFromAssetsRows);
    return textArray.map((str) => str.replace(/\n/g, ' '));
  }

  async getAssetsToAddressSection() {
    const textArray = await getTextFromElementArray(await this.transactionToAssetsRows);
    return textArray.map((str) => str.replace(/\n/g, ' '));
  }

  async expandSectionInDappTransactionWindow(section: 'Origin' | 'From address' | 'To address') {
    await this.transactionOriginSectionExpanderButton.waitForDisplayed();
    switch (section) {
      case 'Origin':
        await this.transactionOriginSectionExpanderButton.click();
        break;
      case 'From address':
        await this.transactionFromSectionExpanderButton.click();
        break;
      case 'To address':
        await this.transactionToSectionExpanderButton.scrollIntoView();
        await this.transactionToSectionExpanderButton.click();
        break;
      default:
        throw new Error(`Unsupported section name: ${section}`);
    }
  }
}

export default new ConfirmTransactionPage();
