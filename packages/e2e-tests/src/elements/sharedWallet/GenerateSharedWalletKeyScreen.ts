/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';

class GenerateSharedWalletKeyScreen extends AddSharedWalletCommonModalElements {
  private WALLET_ICON = '[data-testid="hot-wallet-icon"]';
  private WALLET_TYPE = '[data-testid="wallet-type"]';
  private WALLET_NAME = '[data-testid="wallet-name"]';
  private PASSWORD_INPUT = 'input[type="password"]';

  get walletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_ICON);
  }

  get walletType(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_TYPE);
  }

  get walletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME);
  }

  get passwordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }

  get generateKeyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.nextButton;
  }

  async clickOnGenerateKeyButton(): Promise<void> {
    await this.generateKeyButton.waitForClickable();
    await this.generateKeyButton.click();
  }
}

export default new GenerateSharedWalletKeyScreen();
