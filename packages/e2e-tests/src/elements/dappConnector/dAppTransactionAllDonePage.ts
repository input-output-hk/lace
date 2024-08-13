/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class DAppTransactionAllDonePage {
  private IMAGE_TX_SIGN = '[data-testid="dapp-sign-tx-success-image"]';
  private HEADING_TX_SIGN = '[data-testid="dapp-sign-tx-success-heading"]';
  private DESCRIPTION_TX_SIGN = '[data-testid="dapp-sign-tx-success-description"]';
  private CLOSE_BUTTON_TX_SIGN = '[data-testid="dapp-sign-tx-success-close-button"]';

  private IMAGE_DATA_SIGN = '[data-testid="dapp-sign-data-success-image"]';
  private HEADING_DATA_SIGN = '[data-testid="dapp-sign-data-success-heading"]';
  private DESCRIPTION_DATA_SIGN = '[data-testid="dapp-sign-data-success-description"]';
  private CLOSE_BUTTON_DATA_SIGN = '[data-testid="dapp-sign-data-success-close-button"]';
  get imageTxSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE_TX_SIGN);
  }

  get imageDataSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE_DATA_SIGN);
  }

  get headingTxSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADING_TX_SIGN);
  }
  get headingDataSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HEADING_DATA_SIGN);
  }

  get descriptionTxSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION_TX_SIGN);
  }

  get descriptionDataSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION_DATA_SIGN);
  }

  get closeButtonTxSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON_TX_SIGN);
  }

  get closeButtonDataSign(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON_DATA_SIGN);
  }
}

export default new DAppTransactionAllDonePage();
