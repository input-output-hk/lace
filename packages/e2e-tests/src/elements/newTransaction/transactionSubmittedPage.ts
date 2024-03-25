import CommonDrawerElements from '../CommonDrawerElements';
import { Logger } from '../../support/logger';
import testContext from '../../utils/testContext';

class TransactionSubmittedPage extends CommonDrawerElements {
  private IMAGE = '[data-testid="result-message-img"]';
  private MAIN_TITLE = '[data-testid="result-message-title"]';
  private SUBTITLE = '[data-testid="result-message-description"]';
  private TX_HASH = '[data-testid="transaction-hash"]';
  private VIEW_TRANSACTION_BUTTON = '[data-testid="send-next-btn"]';
  private CLOSE_BUTTON = '[data-testid="send-cancel-btn"]';

  get image() {
    return $(this.IMAGE);
  }

  get title() {
    return $(this.MAIN_TITLE);
  }

  get subtitle() {
    return $(this.SUBTITLE);
  }

  get txHash() {
    return $(this.TX_HASH);
  }

  get viewTransactionButton() {
    return $(this.VIEW_TRANSACTION_BUTTON);
  }

  get closeButton() {
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
