/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';

class WalletCreationPage extends CommonOnboardingElements {
  private WALLET_LOADER = '//div[@data-testid="wallet-create-loader"]';
  private MAIN_LOADER_TEXT = '//p[@data-testid="main-loader-text"]';

  get walletLoader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_LOADER);
  }

  get mainLoaderText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MAIN_LOADER_TEXT);
  }
}

export default new WalletCreationPage();
