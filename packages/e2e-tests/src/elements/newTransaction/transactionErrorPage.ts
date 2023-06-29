import CommonDrawerElements from '../CommonDrawerElements';

class TransactionErrorPage extends CommonDrawerElements {
  private MAIN_TITLE_SELECTOR = '[data-testid="send-error-title"]';
  private ERROR_DESCRIPTION_1 = '[data-testid="send-error-description"]';
  private ERROR_DESCRIPTION_2 = '[data-testid="send-error-description2"]';
  private ERROR_CANCEL_BUTTON = '[data-testid="send-cancel-btn"]';
  private ERROR_BACK_BUTTON = '[data-testid="send-next-btn"]';
  private ERROR_IMAGE = '[data-testid="result-message-img"]';

  get image() {
    return $(this.ERROR_IMAGE);
  }

  get mainTitle() {
    return $(this.MAIN_TITLE_SELECTOR);
  }

  get descriptionLine1() {
    return $(this.ERROR_DESCRIPTION_1);
  }

  get descriptionLine2() {
    return $(this.ERROR_DESCRIPTION_2);
  }

  get cancelButton() {
    return $(this.ERROR_CANCEL_BUTTON);
  }

  get backButton() {
    return $(this.ERROR_BACK_BUTTON);
  }
}

export default new TransactionErrorPage();
