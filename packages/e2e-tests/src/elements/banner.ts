class Banner {
  private CONTAINER = '[data-testid="banner-container"]';
  private ICON = '[data-testid="banner-icon"]';
  private DESCRIPTION = '[data-testid="banner-description"]';
  private BUTTON = '[data-testid="banner-button"]';

  get container() {
    return $(this.CONTAINER);
  }

  get icon() {
    return $(this.ICON);
  }

  get description() {
    return $(this.DESCRIPTION);
  }

  get button() {
    return $(this.BUTTON);
  }

  async getContainerText(): Promise<string> {
    return this.description.getText();
  }
}

export default new Banner();
