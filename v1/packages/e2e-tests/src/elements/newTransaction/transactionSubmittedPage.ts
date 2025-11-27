/* global WebdriverIO */
import CommonDrawerElements from '../CommonDrawerElements';
import { Logger } from '../../support/logger';
import testContext from '../../utils/testContext';
import type { ChainablePromiseElement } from 'webdriverio';

class TransactionSubmittedPage extends CommonDrawerElements {
  private IMAGE = '[data-testid="result-message-img"]';
  private MAIN_TITLE = '[data-testid="result-message-title"]';
  private SUBTITLE = '[data-testid="result-message-description"]';
  private TX_HASH = '[data-testid="transaction-hash"]';
  private VIEW_TRANSACTION_BUTTON = '[data-testid="send-next-btn"]';
  private CLOSE_BUTTON = '[data-testid="send-cancel-btn"]';

  get image(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.IMAGE);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get txHash(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TX_HASH);
  }

  get viewTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.VIEW_TRANSACTION_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  clickCloseButton = async () => {
    await this.closeButton.click();
  };

  saveTransactionHash = async () => {
    const txHashValue = await this.txHash.getText();
    Logger.log(`saving tx hash: ${txHashValue}`);
    testContext.save('txHashValue', txHashValue);
  };
}

export default new TransactionSubmittedPage();
