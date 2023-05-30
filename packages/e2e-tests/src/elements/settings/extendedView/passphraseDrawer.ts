class PassphraseDrawer {
  private DRAWER_TITLE = '[data-testid="drawer-header-title"]';
  private BANNER_ICON = '[data-testid="banner-icon"]';
  private PASSPHRASE_DRAWER_DESCRIPTION = '[data-testid="passphrase-drawer-description"]';
  private BANNER_DESCRIPTION = '[data-testid="banner-description"]';
  private PASSWORD_INPUT_CONTAINER = '[data-testid="password-input-container"]';
  private SHOW_PASSPHRASE_BUTTON = '[data-testid="show-passphrase-button"]';
  private HIDE_PASSPHRASE_BUTTON = '[data-testid="hide-passphrase-button"]';
  private MNEMONIC_WORD_CONTAINER = '[data-testid="mnemonic-word-container"]';
  private MNEMONIC_WORD_WRITEDOWN = '[data-testid="mnemonic-word-writedown"]';

  get title() {
    return $(this.DRAWER_TITLE);
  }

  get description() {
    return $(this.PASSPHRASE_DRAWER_DESCRIPTION);
  }

  get bannerIcon() {
    return $(this.BANNER_ICON);
  }

  get bannerDescription() {
    return $(this.BANNER_DESCRIPTION);
  }

  get passwordInputContainer() {
    return $(this.PASSWORD_INPUT_CONTAINER);
  }

  get showPassphraseButton() {
    return $(this.SHOW_PASSPHRASE_BUTTON);
  }

  get hidePassphraseButton() {
    return $(this.HIDE_PASSPHRASE_BUTTON);
  }

  get mnemonicWordContainers() {
    return $$(this.MNEMONIC_WORD_CONTAINER);
  }

  get mnemonicWordWritedowns() {
    return $$(this.MNEMONIC_WORD_WRITEDOWN);
  }
}

export default new PassphraseDrawer();
