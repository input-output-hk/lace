class MainLoader {
  private MAIN_LOADER_COMPONENT = '[data-testid="main-loader"]';
  private MAIN_LOADER_IMAGE = '[data-testid="main-image"]';
  private MAIN_LOADER_TEXT = '[data-testid="main-text"]';

  get component() {
    return $(this.MAIN_LOADER_COMPONENT);
  }

  get image() {
    return $(this.MAIN_LOADER_IMAGE);
  }

  get text() {
    return $(this.MAIN_LOADER_TEXT);
  }
}

export default new MainLoader();
