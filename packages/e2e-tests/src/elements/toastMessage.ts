class ToastMessage {
  private CONTAINER = '[data-testid="toast-content-wrapper"]';
  private MESSAGE_TEXT = '[data-testid="toast-message-text"]';
  private ICON = '[data-testid="toast-icon"]';
  private CLOSE_BUTTON = '[data-testid="toast-close-btn"]';
  private PROGRESS_BAR = '[data-testid="progressbar-wrapper-id"]';

  get container() {
    return $(this.CONTAINER);
  }

  get messageText() {
    return $(this.MESSAGE_TEXT);
  }

  get icon() {
    return $(this.ICON);
  }

  get closeButton() {
    return $(this.CLOSE_BUTTON);
  }

  get progressBar() {
    return $(this.PROGRESS_BAR);
  }
}

export default new ToastMessage();
