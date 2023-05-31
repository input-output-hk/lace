class ForgotPasswordModal {
  private readonly TITLE = '[data-testid="forgot-password-title"]';
  private readonly DESCRIPTION = '[data-testid="forgot-password-description"]';
  private readonly CONFIRM_BUTTON = '[data-testid="forgot-password-confirm-button"]';
  private readonly CANCEL_BUTTON = '[data-testid="forgot-password-cancel-button"]';

  get title() {
    return $(this.TITLE);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton() {
    return $(this.CANCEL_BUTTON);
  }
}

export default new ForgotPasswordModal();
