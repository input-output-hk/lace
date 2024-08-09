/* eslint-disable no-undef */
import CommonOnboardingElements from './commonOnboardingElements';
import type { ChainablePromiseElement } from 'webdriverio';

class ChooseRecoveryMethodPage extends CommonOnboardingElements {
  private LEARN_MORE_URL = '[data-testid="faq-what-is-paper-wallet-url"]';
  private RECOVERY_PHRASE_RADIO_BUTTON = '#radio-btn-control-id-mnemonic';
  private RECOVERY_PHRASE_LABEL = '#radio-btn-label-id-mnemonic';
  private RECOVERY_PHRASE_DESCRIPTION = '[data-test-id="mnemonic-words-description"]';
  private RECOVERY_PHRASE_ICON = '[data-test-id="mnemonic-words-icon"]';
  private PAPER_WALLET_RADIO_BUTTON = '#radio-btn-control-id-paper';
  private PAPER_WALLET_LABEL = '#radio-btn-label-id-paper';
  private PAPER_WALLET_ADVANCED_BADGE = '[data-testid="paper-wallet-advanced-badge"]';
  private PAPER_WALLET_DESCRIPTION = '[data-test-id="paper-wallet-description"]';
  private PAPER_WALLET_ICON = '[data-test-id="paper-wallet-icon"]';
  private PAPER_WALLET_PGP_KEYS_ICON = '[data-testid="paper-wallet-pgp-keys-icon"]';
  private PAPER_WALLET_PGP_KEYS_NOTICE = '[data-testid="paper-wallet-pgp-keys-label"]';

  get learnMoreURL(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LEARN_MORE_URL);
  }

  get recoveryPhraseRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RECOVERY_PHRASE_RADIO_BUTTON);
  }

  get recoveryPhraseLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RECOVERY_PHRASE_LABEL);
  }

  get recoveryPhraseDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RECOVERY_PHRASE_DESCRIPTION);
  }

  get recoveryPhraseIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RECOVERY_PHRASE_ICON);
  }

  get paperWalletRadioButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_RADIO_BUTTON);
  }

  get paperWalletAdvancedBadge(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_ADVANCED_BADGE);
  }

  get paperWalletLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_LABEL);
  }

  get paperWalletDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_DESCRIPTION);
  }

  get paperWalletPGPKeysIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_PGP_KEYS_ICON);
  }

  get paperWalletPGPKeysNotice(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_PGP_KEYS_NOTICE);
  }

  get paperWalletIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAPER_WALLET_ICON);
  }
}

export default new ChooseRecoveryMethodPage();
