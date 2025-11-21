/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class TestDAppPage {
  private WALLET_ITEM = '[data-testid="wallet-item"]';
  private REFRESH_BUTTON = '[data-testid="refresh-button"]';
  private WALLET_FOUND = '[data-testid="wallet-found"]';
  private WALLET_CONNECTED = '[data-testid="wallet-enabled"]';
  private WALLET_API_VERSION = '[data-testid="wallet-api-version"]';
  private WALLET_NAME = '[data-testid="wallet-name"]';
  private WALLET_NETWORK_ID = '[data-testid="wallet-network-id"]';
  private WALLET_UTXO = '[data-testid="wallet-utxo"]';
  private WALLET_BALANCE = '[data-testid="wallet-balance"]';
  private WALLET_CHANGE_ADDRESS = '[data-testid="wallet-change-address"]';
  private WALLET_STAKING_ADDRESS = '[data-testid="wallet-reward-address"]';
  private WALLET_USED_ADDRESS = '[data-testid="wallet-used-address"]';
  private SEND_ADA_OPTION = '[data-testid="send-ada"]';
  private SEND_TOKEN_OPTION = '[data-testid="send-token"]';
  private SEND_ADA_ADDRESS_INPUT = '[data-testid="send-ada-address-input"]';
  private SEND_ADA_VALUE_INPUT = '[data-testid="send-ada-value-input"]';
  private SEND_TOKEN_ADDRESS_INPUT = '[data-testid="send-token-address-input"]';
  private SEND_TOKEN_VALUE_INPUT = '[data-testid="send-token-value-input"]';
  private SEND_TOKEN_POLICY_ID = '[data-testid="send-token-asset-policy-id"]';
  private SEND_TOKEN_ASSET_NAME = '[data-testid="send-token-asset-name-hex"]';
  private SEND_ADA_RUN_BUTTON = '[data-testid="send-ada-run-button"]';
  private SEND_TOKEN_RUN_BUTTON = '[data-testid="send-token-run-button"]';
  private SIGN_DATA_BUTTON = '[data-testid="sign-data-run-button"]';

  get walletItem(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_ITEM);
  }

  get refreshButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REFRESH_BUTTON);
  }

  get walletFound(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_FOUND);
  }

  get walletConnected(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_CONNECTED);
  }

  get walletApiVersion(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_API_VERSION);
  }

  get walletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME);
  }

  get walletNetworkId(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NETWORK_ID);
  }

  get walletUtxo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_UTXO);
  }

  get walletBalance(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_BALANCE);
  }

  get walletChangeAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_CHANGE_ADDRESS);
  }

  get walletStakingAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_STAKING_ADDRESS);
  }

  get walletUsedAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_USED_ADDRESS);
  }

  get sendAdaOption(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_ADA_OPTION);
  }

  get sendTokenOption(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_TOKEN_OPTION);
  }

  get sendAdaAddressInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_ADA_ADDRESS_INPUT);
  }

  get sendAdaValueInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_ADA_VALUE_INPUT);
  }

  get sendAdaTokenInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_ADA_VALUE_INPUT);
  }

  get sendTokenAddressInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_TOKEN_ADDRESS_INPUT);
  }

  get sendTokenValueInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_TOKEN_VALUE_INPUT);
  }

  get sendTokenPolicyId(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_TOKEN_POLICY_ID);
  }

  get sendTokenAssetName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_TOKEN_ASSET_NAME);
  }

  get sendAdaRunButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_ADA_RUN_BUTTON);
  }

  get sendTokenRunButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_TOKEN_RUN_BUTTON);
  }

  get signDataButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGN_DATA_BUTTON);
  }

  async clickOnSignDataButton(): Promise<void> {
    await this.signDataButton.waitForClickable();
    await this.signDataButton.click();
  }
}

export default new TestDAppPage();
