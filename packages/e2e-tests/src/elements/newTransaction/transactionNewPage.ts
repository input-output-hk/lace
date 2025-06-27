/* global WebdriverIO */
import { CoinConfigure } from './coinConfigure';
import { AddressInput } from '../AddressInput';
import { Asset } from '../../data/Asset';
import { ChainablePromiseElement } from 'webdriverio';
import Banner from '../banner';
import CommonDrawerElements from '../CommonDrawerElements';
import testContext from '../../utils/testContext';
import { generateRandomString } from '../../utils/textUtils';
import { browser } from '@wdio/globals';

class TransactionNewPage extends CommonDrawerElements {
  private CONTAINER = '//div[@class="ant-drawer-body"]';
  private ADD_BUNDLE_BUTTON = '[data-testid="add-bundle-button"]';
  private ADDR_SEARCH_RESULTS_ROW = '//div[@data-testid="search-result-row"]';
  private ADDR_SEARCH_RESULTS_ROW_NAME = '//span[@data-testid="search-result-name"]';
  private ADDR_SEARCH_RESULTS_ROW_ADDRESS = '//span[@data-testid="search-result-address"]';
  private METADATA_INPUT_LABEL = '[data-testid="metadata-input-container"] [data-testid="input-label"]';
  private METADATA_INPUT_FIELD = '[data-testid="metadata-input"]';
  private METADATA_COUNTER = '[data-testid="metadata-counter"]';
  private METADATA_BIN_BUTTON = '[data-testid="text-box-item"]';
  private INVALID_ADDRESS_ERROR_SELECTOR = '//span[@data-testid="address-input-error"]';
  private BUNDLE_DESCRIPTION = '[data-testid="bundle-description"]';
  private BACKGROUND_SECTION = '//div[@data-testid="drawer-navigation"]';
  private REVIEW_TRANSACTION_BUTTON = '#send-next-btn';
  private CANCEL_TRANSACTION_BUTTON = '[data-testid="send-cancel-btn"]';
  private TRANSACTION_COSTS_SECTION_LABEL = '[data-testid="transaction-costs-section-label"]';
  private TRANSACTION_FEE_LABEL = '[data-testid="transaction-fee-label"]';
  private TRANSACTION_FEE_VALUE_ADA = '[data-testid="transaction-fee-value-ada"]';
  private TRANSACTION_FEE_VALUE_FIAT = '[data-testid="transaction-fee-value-fiat"]';
  private ADA_ALLOCATION_VALUE_ADA = '[data-testid="ada-allocation-value-ada"]';
  private ADA_ALLOCATION_VALUE_FIAT = '[data-testid="ada-allocation-value-fiat"]';

  get banner(): typeof Banner {
    return Banner;
  }

  coinConfigure(bundleIndex = 1, assetName?: string): CoinConfigure {
    return new CoinConfigure(bundleIndex, assetName);
  }

  get title() {
    return this.drawerNavigationTitle;
  }

  get addBundleButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADD_BUNDLE_BUTTON);
  }

  get backgroundSection(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER).$(this.BACKGROUND_SECTION);
  }

  addressInput(index?: number): AddressInput {
    return new AddressInput(index);
  }

  get transactionCostsSectionLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_COSTS_SECTION_LABEL);
  }

  get transactionFeeLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_LABEL);
  }

  get transactionFeeValueAda(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_VALUE_ADA);
  }

  get transactionFeeValueFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TRANSACTION_FEE_VALUE_FIAT);
  }

  get adaAllocationValueAda(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADA_ALLOCATION_VALUE_ADA);
  }

  get adaAllocationValueFiat(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADA_ALLOCATION_VALUE_FIAT);
  }

  addressBookSearchResultRow(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`(${this.ADDR_SEARCH_RESULTS_ROW})[${index}]`);
  }

  addressBookSearchResultRowName(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`(${this.ADDR_SEARCH_RESULTS_ROW}${this.ADDR_SEARCH_RESULTS_ROW_NAME})[${index}]`);
  }

  addressBookSearchResultRowAddress(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`(${this.ADDR_SEARCH_RESULTS_ROW}${this.ADDR_SEARCH_RESULTS_ROW_ADDRESS})[${index}]`);
  }

  get metadataInputLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_INPUT_LABEL);
  }

  get metadataInputField(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_INPUT_FIELD);
  }

  get txMetadataCounter(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_COUNTER);
  }

  get metadataBinButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.METADATA_BIN_BUTTON);
  }

  get bundleDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BUNDLE_DESCRIPTION);
  }

  get reviewTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.REVIEW_TRANSACTION_BUTTON);
  }

  get cancelTransactionButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_TRANSACTION_BUTTON);
  }

  invalidAddressError(index: number): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`(${this.INVALID_ADDRESS_ERROR_SELECTOR})[${index}]`);
  }

  async getTransactionFeeValueInAda(): Promise<number> {
    await this.transactionFeeValueAda.waitForDisplayed();
    await browser.waitUntil(async () => (await this.transactionFeeValueAda.getText()) !== '', {
      timeout: 2000,
      timeoutMsg: 'fee value should not be empty'
    });

    const stringValue = await this.transactionFeeValueAda.getText();
    const stringValueTrimmed = stringValue.replace(` ${Asset.CARDANO.ticker}`, '');
    return Number(stringValueTrimmed);
  }

  async getAdaAllocationValueInAda(): Promise<number> {
    const stringValue = await this.adaAllocationValueAda.getText();
    const stringValueTrimmed = stringValue.replace(` ${Asset.CARDANO.ticker}`, '');
    return Number(stringValueTrimmed);
  }

  async getAddressBookSearchResultsRows(): Promise<WebdriverIO.ElementArray> {
    await $(this.ADDR_SEARCH_RESULTS_ROW).waitForClickable({ timeout: 5000 });
    return $$(this.ADDR_SEARCH_RESULTS_ROW);
  }

  async getContactName(index: number): Promise<string> {
    return await this.addressBookSearchResultRowName(index).getText();
  }

  async getPartialContactAddress(index: number): Promise<string> {
    const fullAddress = await this.addressBookSearchResultRowAddress(index).getText();
    return String(fullAddress).slice(-6);
  }

  async clickDrawerBackground(): Promise<void> {
    await this.backgroundSection.click();
  }

  clickAddressBookSearchResult = async (index: number) => {
    await this.addressBookSearchResultRow(index).click();
  };

  fillMetadata = async (characters: number) => {
    const text = await generateRandomString(characters);
    await this.metadataInputField.setValue(text);
  };

  saveMetadata = async () => {
    const metadata = await this.metadataInputField.getValue();
    testContext.save('metadata', metadata);
  };
}

export default new TransactionNewPage();
