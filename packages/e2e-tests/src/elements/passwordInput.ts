class PasswordInput {
  private CONTAINER = '[data-testid="password-input-container"]';
  private INPUT = '[data-testid="password-input"]';
  private PASSWORD_SHOW_BUTTON = '[data-testid="password-input-show-icon"]';
  private PASSWORD_HIDE_BUTTON = '[data-testid="password-input-hide-icon"]';
  private ERROR = '[data-testid="password-input-error"]';

  get container() {
    return $(this.CONTAINER);
  }

  get input() {
    return this.container.$(this.INPUT);
  }

  get passwordShowButton() {
    return this.container.$(this.PASSWORD_SHOW_BUTTON);
  }

  get passwordHideButton() {
    return this.container.$(this.PASSWORD_HIDE_BUTTON);
  }

  get error() {
    return this.container.$(this.ERROR);
  }
}

export default new PasswordInput();
