/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class MainPage {
  private readonly CONTAINER: string = '#nami-mode';

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }
}
export default new MainPage();
