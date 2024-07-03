/* eslint-disable no-undef */
import { ChainablePromiseArray } from 'webdriverio/build/types';
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';
import { RecoveryPhrase } from '../../types/onboarding';
import { clearInputFieldValue, setInputFieldValue } from '../../utils/inputFieldUtils';
import testContext from '../../utils/testContext';
import { browser } from '@wdio/globals';

class RecoveryPhrasePage extends CommonOnboardingElements {
  private MNEMONIC_WORD = '[data-testid="mnemonic-word-writedown"]';
  private MNEMONIC_INPUT = '[data-testid="mnemonic-word-input"]';
  private MNEMONIC_AUTOCOMPLETE_DROPDOWN = '.ant-select-dropdown';
  private MNEMONIC_WORD_AUTOCOMPLETE_OPTIONS = '.ant-select-item-option-content';
  private MNEMONIC_ERROR_MESSAGE = '[data-testid="passphrase-error"]';
  private MNEMONIC_LENGTH_SELECTOR_12 = '[data-testid="recovery-phrase-12"]';
  private MNEMONIC_LENGTH_SELECTOR_15 = '[data-testid="recovery-phrase-15"]';
  private MNEMONIC_LENGTH_SELECTOR_24 = '[data-testid="recovery-phrase-24"]';
  private WATCH_VIDEO_LINK = '[data-testid="watch-video-link"]';
  private COPY_TO_CLIPBOARD_BUTTON = '[data-testid="copy-to-clipboard-button"]';
  private PASTE_FROM_CLIPBOARD_BUTTON = '[data-testid="paste-from-clipboard-button"]';
  private CLIPBOARD_TOOLTIP = '[data-testid="mnemonic-copy-paste-tooltip"]';
  private CLIPBOARD_TOOLTIP_LINK = '[data-testid="mnemonic-copy-paste-tooltip"] a';
  private mnemonicWordsList: string[] = [];

  get mnemonicWords(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_WORD);
  }

  get mnemonicAutocompleteOptions(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_WORD_AUTOCOMPLETE_OPTIONS);
  }

  get mnemonicInputs(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.MNEMONIC_INPUT);
  }

  get mnemonicAutocompleteDropdown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MNEMONIC_AUTOCOMPLETE_DROPDOWN);
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

  get clipboardTooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLIPBOARD_TOOLTIP);
  }

  get clipboardTooltipLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLIPBOARD_TOOLTIP_LINK);
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

  async clickOnInput() {
    const inputs = await this.mnemonicInputs;
    await inputs[0].click();
  }

  async clickHeaderToLoseFocus() {
    await this.stepHeader.click();
  }

  async addCharToMnemonicField(characters: string, inputNumber: number) {
    const inputs = await this.mnemonicInputs;
    await inputs[inputNumber].addValue(characters);
  }

  async changeRandomMnemonicField() {
    const randomFieldNo = Math.floor(Math.random() * 8);
    const inputs = await this.mnemonicInputs;
    testContext.save('mnemonic', { index: randomFieldNo, value: await inputs[randomFieldNo].getValue() });
    await inputs[randomFieldNo].click();
    await browser.keys('.');
    await this.stepTitle.click(); // Click outside input fields to trigger validation
  }

  async clearRandomMnemonicField() {
    const randomFieldNo = Math.floor(Math.random() * 8);
    const inputs = await this.mnemonicInputs;
    await clearInputFieldValue(inputs[randomFieldNo]);
  }

  async restorePreviousMnemonicWord() {
    const mnemonic = testContext.load('mnemonic') as { value: string; index: number };
    await this.enterMnemonicWord(mnemonic.value, mnemonic.index);
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

  async enterMnemonicWord(value: string, inputNumber = 0, shouldTriggerValidation = true) {
    const inputs = await this.mnemonicInputs;
    await setInputFieldValue(inputs[inputNumber], value);
    if (shouldTriggerValidation) {
      await this.stepTitle.click(); // Click outside input fields to trigger validation
    }
  }

  async enterMnemonicWords(mnemonicWordsList: string[] = []): Promise<void> {
    if (mnemonicWordsList.length > 0) {
      this.mnemonicWordsList = mnemonicWordsList;
    }
    const mnemonicInputs = await this.mnemonicInputs;
    for (let i = 0; i < this.mnemonicWordsList.length; i++) {
      await clearInputFieldValue(mnemonicInputs[i]);
      await mnemonicInputs[i].setValue(this.mnemonicWordsList[i]);
    }
  }

  async goToMnemonicVerificationPage(
    flowType: 'Create' | 'Restore',
    mnemonicWords: string[] = [],
    fillValues = false
  ): Promise<void> {
    if (flowType === 'Create') {
      this.mnemonicWordsList = await this.getMnemonicWordTexts();
      await this.nextButton.click();
    }
    if (fillValues) {
      flowType === 'Create' ? await this.enterMnemonicWords() : await this.enterMnemonicWords(mnemonicWords);
    }
  }
}

export default new RecoveryPhrasePage();
