import PasswordInput from '../passwordInput';

class TransactionPasswordPage {
  private DRAWER_HEADER_TITLE = '[data-testid="drawer-header-title"]';
  private DRAWER_HEADER_SUBTITLE = '[data-testid="drawer-header-subtitle"]';
  private CANCEL_BUTTON = '[data-testid="send-cancel-btn"]';
  private NEXT_BUTTON = '[data-testid="send-next-btn"]';
  private BUTTON_LOADER = '[data-testid="btn-loader-container"]';

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

  get buttonLoader() {
    return $(this.BUTTON_LOADER);
  }

  fillPasswordAndConfirm = async (password: string) => {
    await this.passwordInput.setValue(password);
    await this.nextButton.waitForClickable();
    await this.nextButton.click();
    await this.buttonLoader.waitForDisplayed({ timeout: 20_000, reverse: true });
  };
}

export default new TransactionPasswordPage();
