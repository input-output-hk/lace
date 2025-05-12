/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';
import { AddSharedWalletCommonModalElements } from './AddSharedWalletCommonModalElements';
import type { CosignersData } from '../../types/sharedWallet';

class AddWalletCosignersScreen extends AddSharedWalletCommonModalElements {
  private YOUR_IDENTIFIER_INPUT = '(//input[@data-testid="identifier-input"])[1]';
  private YOUR_IDENTIFIER_LABEL = '(//input[@data-testid="identifier-label"])[1]';
  private YOUR_SHARED_WALLET_KEY_INPUT = '(//input[@data-testid="shared-wallet-key-input"])[1]';
  private YOUR_SHARED_WALLET_KEY_LABEL = '(//input[@data-testid="shared-wallet-key-label"])[1]';
  private COSIGNER_1_IDENTIFIER_INPUT = '(//input[@data-testid="identifier-input"])[2]';
  private COSIGNER_1_IDENTIFIER_LABEL = '(//input[@data-testid="identifier-label"])[2]';
  private COSIGNER_1_SHARED_WALLET_KEY_INPUT = '(//input[@data-testid="shared-wallet-key-input"])[2]';
  private COSIGNER_1_SHARED_WALLET_KEY_LABEL = '(//input[@data-testid="shared-wallet-key-label"])[2]';
  private COSIGNER_2_IDENTIFIER_INPUT = '(//input[@data-testid="identifier-input"])[3]';
  private COSIGNER_2_IDENTIFIER_LABEL = '(//input[@data-testid="identifier-label"])[3]';
  private COSIGNER_2_SHARED_WALLET_KEY_INPUT = '(//input[@data-testid="shared-wallet-key-input"])[3]';
  private COSIGNER_2_SHARED_WALLET_KEY_LABEL = '(//input[@data-testid="shared-wallet-key-label"])[3]';

  get yourIdentifierInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.YOUR_IDENTIFIER_INPUT);
  }

  get yourIdentifierLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.YOUR_IDENTIFIER_LABEL);
  }

  get yourSharedWalletKeyInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.YOUR_SHARED_WALLET_KEY_INPUT);
  }

  get yourSharedWalletKeyLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.YOUR_SHARED_WALLET_KEY_LABEL);
  }

  get cosigner1IdentifierInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_1_IDENTIFIER_INPUT);
  }

  get cosigner1IdentifierLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_1_IDENTIFIER_LABEL);
  }

  get cosigner1SharedWalletKeyInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_1_SHARED_WALLET_KEY_INPUT);
  }

  get cosigner1SharedWalletKeyLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_1_SHARED_WALLET_KEY_LABEL);
  }

  get cosigner2IdentifierInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_2_IDENTIFIER_INPUT);
  }

  get cosigner2IdentifierLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_2_IDENTIFIER_LABEL);
  }

  get cosigner2SharedWalletKeyInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_2_SHARED_WALLET_KEY_INPUT);
  }

  get cosigner2SharedWalletKeyLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COSIGNER_2_SHARED_WALLET_KEY_LABEL);
  }

  async enterIdentifiersAndKeys(cosignersData: CosignersData): Promise<void> {
    await this.yourIdentifierInput.setValue(cosignersData.yourIdentifier);
    await this.cosigner1IdentifierInput.setValue(cosignersData.cosigner1Identifier);
    await this.cosigner1SharedWalletKeyInput.setValue(cosignersData.cosigner1Key);
    await this.cosigner2IdentifierInput.setValue(cosignersData.cosigner2Identifier);
    await this.cosigner2SharedWalletKeyInput.setValue(cosignersData.cosigner2Key);
  }
}

export default new AddWalletCosignersScreen();
