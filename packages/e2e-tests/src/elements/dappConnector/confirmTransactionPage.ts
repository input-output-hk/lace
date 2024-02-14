/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonDappPageElements from './commonDappPageElements';

class ConfirmTransactionPage extends CommonDappPageElements {
  private TRANSACTION_TYPE_TITLE = '[data-testid="dapp-transaction-title"]';
  private TRANSACTION_TYPE = '[data-testid="dapp-transaction-type"]';
  private TRANSACTION_AMOUNT_TITLE = '[data-testid="dapp-transaction-amount-title"]';
  private TRANSACTION_AMOUNT_VALUE = '[data-testid="dapp-transaction-amount-value"]';
  private TRANSACTION_AMOUNT_FEE_TITLE = '[data-testid="tx-fee-title"]';
  // private TRANSACTION_AMOUNT_FEE_TITLE_TOOLTIP_ICON = '[data-testid="tx-fee-tooltip-icon"]';
  private TRANSACTION_AMOUNT_FEE_VALUE_ADA = '[data-testid="tx-fee-ada"]';
  // private TRANSACTION_AMOUNT_FEE_VALUE_FIAT = '[data-testid="tx-fee-fiat"]';
  // private TRANSACTION_AMOUNT_ASSET = '[data-testid="dapp-transaction-asset"]';
  private TRANSACTION_AMOUNT_NFTS_TITLE = '[data-testid="dapp-transaction-nfts-title"]';
  private TRANSACTION_AMOUNT_NFTS_CONTAINER = '[data-testid="dapp-transaction-nfts-container"]';

  private TRANSACTION_AMOUNT_TOKENS_TITLE = '[data-testid="dapp-transaction-tokens-title"]';
  private TRANSACTION_AMOUNT_TOKEN_CONTAINER = '[data-testid="dapp-transaction-token-container"]';

  private TRANSACTION_RETURNED_DEPOSIT = '[data-testid="dapp-transaction-returned-deposit-title"]';
  private TRANSACTION_DEPOSIT = '[data-testid="dapp-transaction-deposit-title"]';
  private TRANSACTION_FEE = '[data-testid="dapp-transaction-fee"]';
  private TRANSACTION_TO_ADDRESS_TITLE = '[data-testid="dapp-transaction-to-address-title"]';
  private TRANSACTION_TO_ADDRESS = '[data-testid="dapp-transaction-to-address-address"]';
  // private TRANSACTION_DATA_TITLE = '[data-testid="dapp-transaction-data-title"]';
  // private TRANSACTION_DATA = '[data-testid="dapp-transaction-data"]';
  private TRANSACTION_FROM_ADDRESS_TITLE = '[data-testid="dapp-transaction-from-address-title"]';
  private TRANSACTION_FROM_ADDRESS_ADDRESS = '[data-testid="dapp-transaction-from-address-address"]';

  private CONFIRM_BUTTON = '[data-testid="dapp-transaction-confirm"]';
  private CANCEL_BUTTON = '[data-testid="dapp-transaction-cancel"]';

  get transactionAmountNftsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_NFTS_TITLE);
  }

  get transactionAmountNftsContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_NFTS_CONTAINER);
  }

  get transactionAmountTokensTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_TOKENS_TITLE);
  }

  get transactionAmountTokensContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_TOKEN_CONTAINER);
  }

  get transactionReturnedDeposit(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_RETURNED_DEPOSIT);
  }

  get transactionDeposit(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_DEPOSIT);
  }

  get transactionFee(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE);
  }

  get transactionToAddressTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_TO_ADDRESS_TITLE);
  }

  get transactionToAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_TO_ADDRESS);
  }

  get transactionFromAddressTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FROM_ADDRESS_TITLE);
  }

  get transactionFromAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FROM_ADDRESS_ADDRESS);
  }

  get transactionTypeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_TYPE_TITLE);
  }

  get transactionType(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_TYPE);
  }

  get transactionAmountTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_TITLE);
  }

  get transactionAmountValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_VALUE);
  }
  get transactionFeeTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_FEE_TITLE);
  }

  // get transactionFeeTooltipIcon(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_AMOUNT_FEE_TITLE_TOOLTIP_ICON);
  // }

  get transactionFeeValueAda(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_AMOUNT_FEE_VALUE_ADA);
  }

  // get transactionFeeValueFiat(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_AMOUNT_FEE_VALUE_FIAT);
  // }

  // get transactionAmountAsset(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_AMOUNT_ASSET);
  // }

  // get transactionRecipientTitle(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_RECIPIENT_TITLE);
  // }

  // get transactionRecipientAddressTitle(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_RECIPIENT_ADDRESS_TITLE);
  // }

  // get transactionRecipientAddress(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_RECIPIENT_ADDRESS);
  // }

  // get transactionDataTitle(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_DATA_TITLE);
  // }

  // get transactionData(): ChainablePromiseElement<WebdriverIO.Element> {
  //   return $(this.TRANSACTION_DATA);
  // }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }
  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }
}

export default new ConfirmTransactionPage();
