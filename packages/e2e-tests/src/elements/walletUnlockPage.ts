import PasswordInput from './passwordInput';

class WalletUnlockPage {
  private MAIN_IMG = '[data-testid="unlock-screen-img"]';
  private TITLE = '[data-testid="unlock-screen-title"]';
  private UNLOCK_BUTTON = '[data-testid="unlock-button"]';
  private FORGOT_PASSWORD_LINK = '[data-testid="forgot-password-link"]';
  private HELP_AND_SUPPORT_BUTTON = '[data-testid="lock-screen-help-button"]';

  get mainImage() {
    return $(this.MAIN_IMG);
  }

  get title() {
    return $(this.TITLE);
  }

  get passwordInput() {
    return PasswordInput.input;
  }

  get unlockButton() {
    return $(this.UNLOCK_BUTTON);
  }

  get forgotPassword() {
    return $(this.FORGOT_PASSWORD_LINK);
  }

  get helpAndSupportButton() {
    return $(this.HELP_AND_SUPPORT_BUTTON);
  }
}

export default new WalletUnlockPage();
