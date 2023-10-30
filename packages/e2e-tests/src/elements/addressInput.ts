/* eslint-disable no-undef */
import { LocatorStrategy } from '../actor/webTester';
import { WebElement, WebElementFactory as Factory } from './webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class AddressInput extends WebElement {
  protected CONTAINER = '//div[@data-testid="address-input"]';
  private SEARCH_INPUT = '//input[@data-testid="search-input"]';
  private SEARCH_LABEL = '//div[@data-testid="input-label"]';
  private SEARCH_LOADER = '[data-testid="search-loader"]';
  private CTA_BUTTON = '[data-testid="address-book-btn"]';
  private ADDRESS_INPUT_NAME = '[data-testid="search-result-name"]';
  private ADA_HANDLE_ICON_INVALID = '[data-icon="exclamation-circle"]';
  private ADA_HANDLE_INPUT_ERROR = '[data-testid="handle-input-error"]';

  constructor(index?: number) {
    super();
    this.CONTAINER =
      typeof index === 'undefined' || index.toString() === '' ? this.CONTAINER : `(${this.CONTAINER})[${index}]`;
  }

  container(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}`, 'xpath');
  }

  input(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SEARCH_INPUT}`, 'xpath');
  }

  label(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SEARCH_LABEL}`, 'xpath');
  }

  get ctaButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.CTA_BUTTON);
  }

  name(): ChainablePromiseElement<WebdriverIO.Element> {
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

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
