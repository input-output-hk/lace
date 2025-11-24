/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { browser } from '@wdio/globals';
import { pasteValueIntoInputField } from '../utils/inputFieldUtils';

export class AddressInput {
  protected CONTAINER = '//div[@data-testid="address-input"]';
  private SEARCH_INPUT = '//input[@data-testid="search-input"]';
  private SEARCH_LABEL = '//div[@data-testid="input-label"]';
  private SEARCH_LOADER = '[data-testid="search-loader"]';
  private CTA_BUTTON = '[data-testid="address-book-btn"]';
  private ADDRESS_INPUT_NAME = '[data-testid="search-result-name"]';
  private ADA_HANDLE_ICON_INVALID = '[data-icon="exclamation-circle"]';
  private ADA_HANDLE_INPUT_ERROR = '[data-testid="handle-input-error"]';

  constructor(index = 1) {
    this.CONTAINER = `(${this.CONTAINER})[${index}]`;
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get input(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.SEARCH_INPUT}`);
  }

  get label(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.SEARCH_LABEL}`);
  }

  get ctaButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.CTA_BUTTON);
  }

  get name(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.ADDRESS_INPUT_NAME);
  }

  get searchLoader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEARCH_LOADER);
  }

  get invalidAdaHandleIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.ADA_HANDLE_ICON_INVALID);
  }

  get adaHandleError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADA_HANDLE_INPUT_ERROR);
  }

  fillAddress = async (address: string, method: 'keys' | 'paste' | 'setValue' = 'setValue'): Promise<void> => {
    await this.input.waitForClickable();
    switch (method) {
      case 'paste':
        await pasteValueIntoInputField(await this.input, address);
        break;
      case 'keys':
        await this.input.click();
        await browser.keys(address);
        break;
      case 'setValue':
      default:
        await this.input.setValue(address);
        break;
    }
  };

  fillAddressWithFirstChars = async (address: string, characters: number): Promise<void> => {
    await this.fillAddress(address.slice(0, characters));
  };

  addToAddress = async (value: string): Promise<void> => {
    await this.input.addValue(value);
  };

  clickAddAddressButton = async (): Promise<void> => {
    await browser.pause(500);
    await this.ctaButton.waitForClickable();
    await this.ctaButton.click();
  };
}
