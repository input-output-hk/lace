/* global WebdriverIO */

import CommonOnboardingElements from './commonOnboardingElements';
import type { ChainablePromiseElement } from 'webdriverio';

class SelectBlockchainPage extends CommonOnboardingElements {
  private readonly BITCOIN_OPTION_RADIO_BUTTON = '[data-testid="bitcoin-option-radio-button"]';
  private readonly BITCOIN_OPTION_TITLE = '[data-testid="bitcoin-option-title"]';
  private readonly BITCOIN_OPTION_BADGE = '[data-testid="bitcoin-option-badge"]';
  private readonly BITCOIN_OPTION_DESCRIPTION = '[data-testid="bitcoin-option-description"]';
  private readonly BITCOIN_OPTION_ICON = '[data-testid="bitcoin-option-icon"]';
  private readonly CARDANO_OPTION_RADIO_BUTTON = '[data-testid="cardano-option-radio-button"]';
  private readonly CARDANO_OPTION_TITLE = '[data-testid="cardano-option-title"]';
  private readonly CARDANO_OPTION_BADGE = '[data-testid="cardano-option-badge"]';
  private readonly CARDANO_OPTION_DESCRIPTION = '[data-testid="cardano-option-description"]';
  private readonly CARDANO_OPTION_ICON = '[data-testid="cardano-option-icon"]';

  get bitcoinOptionRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BITCOIN_OPTION_RADIO_BUTTON);
  }

  get bitcoinOptionTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BITCOIN_OPTION_TITLE);
  }

  get bitcoinOptionBadge(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BITCOIN_OPTION_BADGE);
  }

  get bitcoinOptionDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BITCOIN_OPTION_DESCRIPTION);
  }

  get bitcoinOptionIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BITCOIN_OPTION_ICON);
  }

  get cardanoOptionRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_OPTION_RADIO_BUTTON);
  }

  get cardanoOptionTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_OPTION_TITLE);
  }

  get cardanoOptionBadge(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_OPTION_BADGE);
  }

  get cardanoOptionDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_OPTION_DESCRIPTION);
  }

  get cardanoOptionIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CARDANO_OPTION_ICON);
  }

  async selectBlockchain(blockchain: 'Cardano' | 'Bitcoin') {
    switch (blockchain) {
      case 'Cardano':
        await this.cardanoOptionRadioButton.click();
        break;
      case 'Bitcoin':
        await this.bitcoinOptionRadioButton.click();
        break;
      default:
        throw new Error(`Unsupported blockchain: ${blockchain}`);
    }
  }
}

export default new SelectBlockchainPage();
