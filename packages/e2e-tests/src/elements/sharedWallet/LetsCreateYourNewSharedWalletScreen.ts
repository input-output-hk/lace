/* global WebdriverIO */
import { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';
import { clearInputFieldValue } from '../../utils/inputFieldUtils';

class LetsCreateYourNewSharedWalletScreen extends AddSharedWalletCommonModalElements {
  private SHARED_WALLET_NAME_INPUT = '[data-testid="wallet-name-input"]';
  private SHARED_WALLET_NAME_LABEL = '[data-testid="input-label"]';
  private ACTIVE_LACE_WALLET_NOTICE = '[data-testid="active-lace-wallet-notice"]';
  private ACTIVE_LACE_WALLET_ICON = '[data-testid="active-lace-wallet-icon"]';
  private ACTIVE_LACE_WALLET_NAME = '[data-testid="active-lace-wallet-name"]';

  get sharedWalletNameInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_NAME_INPUT);
  }

  get sharedWalletNameLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHARED_WALLET_NAME_LABEL);
  }

  get activeLaceWalletNotice(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_LACE_WALLET_NOTICE);
  }

  get activeLaceWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_LACE_WALLET_ICON);
  }

  get activeLaceWalletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_LACE_WALLET_NAME);
  }

  async enterSharedWalletName(name: string): Promise<void> {
    await this.sharedWalletNameInput.waitForClickable();
    await clearInputFieldValue(await this.sharedWalletNameInput);
    await this.sharedWalletNameInput.setValue(name);
  }
}

export default new LetsCreateYourNewSharedWalletScreen();
