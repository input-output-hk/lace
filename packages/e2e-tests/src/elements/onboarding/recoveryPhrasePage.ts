/* eslint-disable no-undef */
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';

export class RecoveryPhrasePage extends CommonOnboardingElements {
  private MNEMONIC_WORD = '[data-testid="mnemonic-word-writedown"]';
  private MNEMONIC_INPUT = '[data-testid="mnemonic-word-input"]';
  private MNEMONIC_WORD_AUTOCOMPLETE_OPTIONS = '.ant-select-item-option-content';
  private MNEMONIC_AUTOCOMPLETE_DROPDOWN = '.ant-select-dropdown';
  private MNEMONIC_ERROR_MESSAGE = '[data-testid="passphrase-error"]';

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
