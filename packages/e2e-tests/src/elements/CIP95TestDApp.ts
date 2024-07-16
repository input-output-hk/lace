/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { browser } from '@wdio/globals';

class CIP95TestDApp {
  private REFRESH_BUTTON = '[data-testid="refresh-button"]';
  private PUB_DREP_KEY_ENTRY = '[data-testid="pub-drep-key"]';
  private NO_REGISTERED_PUB_STAKE_KEYS = '[data-testid="no-registered-pub-stake-keys"]';
  private NO_UNREGISTERED_PUB_STAKE_KEYS = '[data-testid="no-unregistered-pub-stake-keys"]';
  private REGISTERED_PUB_STAKE_KEY_TEMPLATE = '[data-testid="registered-pub-stake-key-###INDEX###"]';
  private UNREGISTERED_PUB_STAKE_KEY_TEMPLATE = '[data-testid="unregistered-pub-stake-key-###INDEX###"]';

  public readonly CIP95_TEST_DAPP_URL = 'https://wklos-iohk.github.io/cip95-cardano-wallet-connector/';
  public readonly CIP95_TEST_DAPP_NAME = '✨Demos dApp✨';

  get refreshButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REFRESH_BUTTON);
  }

  get pubDRepKey(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PUB_DREP_KEY_ENTRY);
  }

  get noRegisteredPubStakeKeysMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NO_REGISTERED_PUB_STAKE_KEYS);
  }

  get noUnregisteredPubStakeKeysMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NO_UNREGISTERED_PUB_STAKE_KEYS);
  }

  registeredPubStakeKey(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REGISTERED_PUB_STAKE_KEY_TEMPLATE.replace('###INDEX###', String(index)));
  }

  unregisteredPubStakeKey(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.UNREGISTERED_PUB_STAKE_KEY_TEMPLATE.replace('###INDEX###', String(index)));
  }

  async openTestDApp(): Promise<void> {
    await browser.newWindow(this.CIP95_TEST_DAPP_URL);
  }

  async switchToTestDAppWindow() {
    await browser.switchWindow(this.CIP95_TEST_DAPP_URL);
  }
}

export default new CIP95TestDApp();
