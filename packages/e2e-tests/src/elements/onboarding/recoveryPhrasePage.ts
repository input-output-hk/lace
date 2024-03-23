/* eslint-disable no-undef */
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';
import { RecoveryPhrase } from '../../types/onboarding';

class RecoveryPhrasePage extends CommonOnboardingElements {
  private MNEMONIC_WORD = '[data-testid="mnemonic-word-writedown"]';
  private MNEMONIC_INPUT = '[data-testid="mnemonic-word-input"]';
  private MNEMONIC_WORD_AUTOCOMPLETE_OPTIONS = '.ant-select-item-option-content';
  private MNEMONIC_AUTOCOMPLETE_DROPDOWN = '.ant-select-dropdown';
  private MNEMONIC_ERROR_MESSAGE = '[data-testid="passphrase-error"]';
  private MNEMONIC_LENGTH_SELECTOR_12 = '//p[@data-testid="wallet-setup-step-subtitle"]//div[@title="12"]';
  private MNEMONIC_LENGTH_SELECTOR_15 = '//p[@data-testid="wallet-setup-step-subtitle"]//div[@title="15"]';
  private MNEMONIC_LENGTH_SELECTOR_24 = '//p[@data-testid="wallet-setup-step-subtitle"]//div[@title="24"]';
  private WATCH_VIDEO_LINK = '[data-testid="find-out-more-link"]';
  private COPY_TO_CLIPBOARD_BUTTON = '[data-testid="copy-to-clipboard-button"]';
  private PASTE_FROM_CLIPBOARD_BUTTON = '[data-testid="paste-from-clipboard-button"]';

  get mnemonicAutocompleteDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MNEMONIC_AUTOCOMPLETE_DROPDOWN);
  }

  get mnemonicWords(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_WORD);
  }

  get mnemonicAutocompleteOptions(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_WORD_AUTOCOMPLETE_OPTIONS);
  }

  get mnemonicInputs(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_INPUT);
  }

  get errorMessage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MNEMONIC_ERROR_MESSAGE);
  }

  get watchVideoLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WATCH_VIDEO_LINK);
  }

  get copyToClipboardButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COPY_TO_CLIPBOARD_BUTTON);
  }

  get pasteFromClipboardButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASTE_FROM_CLIPBOARD_BUTTON);
  }

  get mnemonicLengthSelector12(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MNEMONIC_LENGTH_SELECTOR_12);
  }

  get mnemonicLengthSelector15(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MNEMONIC_LENGTH_SELECTOR_15);
  }

  get mnemonicLengthSelector24(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MNEMONIC_LENGTH_SELECTOR_24);
  }

  async selectMnemonicLength(length: RecoveryPhrase): Promise<void> {
    switch (length) {
      case '12':
        await this.mnemonicLengthSelector12.click();
        break;
      case '15':
        await this.mnemonicLengthSelector15.click();
        break;
      case '24':
        await this.mnemonicLengthSelector24.click();
        break;
      default:
        throw new Error('Invalid mnemonic length');
    }
  }

  async getMnemonicAutocompleteOptionsValues(): Promise<string[]> {
    return this.mnemonicAutocompleteOptions.map(async (option) => await option.getText());
  }

  async getMnemonicWordTexts(): Promise<string[]> {
    const results: string[] = [];
    const elements = await this.mnemonicWords;
    for (const element of elements) {
      results.push(await element.getText());
    }
    return results;
  }
}

export default new RecoveryPhrasePage();
