import PasswordInput from '../passwordInput';

class StakingPasswordDrawer {
  private TITLE = '[data-testid="staking-confirmation-title"]';
  private SUBTITLE = '[data-testid="staking-confirmation-subtitle"]';
  private CONFIRM_BUTTON = '[data-testid="stake-sign-confirmation-btn"]';

  get title() {
    return $(this.TITLE);
  }

  get subtitle() {
    return $(this.SUBTITLE);
  }

  get confirmButton() {
    return $(this.CONFIRM_BUTTON);
  }

  get passwordInputContainer() {
    return PasswordInput.container;
  }
}

export default new StakingPasswordDrawer();
