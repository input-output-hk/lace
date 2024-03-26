class MainLoader {
  private MAIN_LOADER_COMPONENT = '[data-testid="main-loader"]';
  private MAIN_LOADER_TEXT = '[data-testid="main-loader-text"]';

  get mainLoaderComponent() {
    return $(this.MAIN_LOADER_COMPONENT);
  }

  get mainLoaderText() {
    return $(this.MAIN_LOADER_TEXT);
  }

  async waitUntilLoaderDisappears() {
    await browser.pause(500);
    if (await this.mainLoaderComponent.isDisplayed()) {
      await this.mainLoaderComponent.waitForDisplayed({ timeout: 15_000, reverse: true });
    }
    if (await this.mainLoaderText.isDisplayed()) {
      await this.mainLoaderText.waitForDisplayed({ timeout: 255_000, reverse: true });
    }
  }
}

export default new MainLoader();
