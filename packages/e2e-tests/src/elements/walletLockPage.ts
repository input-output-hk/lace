class WalletLockPage {
  private LACE_LOGO = '[data-testid="lock-screen-logo"]';
  private HELP_AND_SUPPORT_BUTTON = '[data-testid="lock-screen-help-button"]';
  private MAIN_IMG = '[data-testid="lock-screen-img"]';
  private TEXT1 = '[data-testid="lock-screen-text1"]';
  private TEXT2 = '[data-testid="lock-screen-text2"]';

  get laceLogo() {
    return $(this.LACE_LOGO);
  }

  get helpAndSupportButton() {
    return $(this.HELP_AND_SUPPORT_BUTTON);
  }

  get mainImg() {
    return $(this.MAIN_IMG);
  }

  get text1() {
    return $(this.TEXT1);
  }

  get text2() {
    return $(this.TEXT2);
  }
}

export default new WalletLockPage();
