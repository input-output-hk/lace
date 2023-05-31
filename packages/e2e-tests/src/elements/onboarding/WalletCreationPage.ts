/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';

class WalletCreationPage extends CommonOnboardingElements {
  private WALLET_LOADER = '//div[@data-testid="wallet-create-loader"]';

  get walletLoader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_LOADER);
  }
}

export default new WalletCreationPage();
