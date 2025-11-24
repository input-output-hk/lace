/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { browser } from '@wdio/globals';

class MainLoader {
  private MAIN_LOADER_COMPONENT = '[data-testid="main-loader"]';

  get mainLoaderComponent(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_LOADER_COMPONENT);
  }

  async waitUntilLoaderDisappears() {
    await browser.pause(500);
    if (await this.mainLoaderComponent.isDisplayed()) {
      await this.mainLoaderComponent.waitForDisplayed({ timeout: 150_000, reverse: true });
    }
  }
}

export default new MainLoader();
