import PasswordInput from '../passwordInput';

class TransactionPasswordPage {
  private DRAWER_HEADER_TITLE = '[data-testid="drawer-header-title"]';
  private DRAWER_HEADER_SUBTITLE = '[data-testid="drawer-header-subtitle"]';
  private CANCEL_BUTTON = '[data-testid="send-cancel-btn"]';
  private NEXT_BUTTON = '[data-testid="send-next-btn"]';

  get headerTitle() {
    return $(this.DRAWER_HEADER_TITLE);
  }
  get headerSubtitle() {
    return $(this.DRAWER_HEADER_SUBTITLE);
  }

  get passwordInput() {
    return PasswordInput.input;
  }

  get passwordShowHideButton() {
    return PasswordInput.passwordShowButton;
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }

  get nextButton() {
    return $(this.NEXT_BUTTON);
  }
}

export default new TransactionPasswordPage();
