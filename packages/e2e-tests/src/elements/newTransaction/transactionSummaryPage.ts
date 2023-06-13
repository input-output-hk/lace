/* eslint-disable no-undef */
import webTester, { LocatorStrategy } from '../../actor/webTester';
import { WebElement, WebElementFactory as Factory } from '../webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class TransactionSummaryPage extends WebElement {
  private CONTAINER = '//div[@class="ant-drawer-body"]';
  private MAIN_TITLE = '//div[@data-testid="drawer-header-title"]';
  private SUBTITLE = '//div[@data-testid="drawer-header-subtitle"]';
  private BUNDLE_ROW = '//div[@data-testid="bundle-summary-row"]';
  private BUNDLE_ROW_TITLE = '//span[@data-testid="bundle-summary-title"]';
  private RECIPIENT_TITLE = '//p[@data-testid="output-summary-recipient-title-label"]';
  private RECIPIENT_ADDRESS = '//span[@data-testid="output-summary-recipient-address"]';
  private SENDING_TITLE = '//p[@data-testid="output-summary-sending-title-label"]';
  private ASSET_INFO_CONTAINER = '//div[@data-testid="asset-info"]';
  private ASSET_INFO_VALUE = '//span[@data-testid="asset-info-amount"]';
  private ASSET_INFO_FIAT = '//span[@data-testid="asset-info-amount-fiat"]';
  private METADATA_CONTAINER = '//div[@data-testid="metadata-container"]';
  private METADATA_LABEL = '//span[@data-testid="metadata-label"]';
  private METADATA_VALUE = '//span[@data-testid="metadata-value"]';
  private FEE_CONTAINER = '//div[@data-testid="summary-fee-container"]';
  private FEE_TITLE = '//p[@data-testid="summary-fee-label"]';
  private CONFIRM_BUTTON = '#send-next-btn';

  constructor() {
    super();
  }

  setAssetRow(index?: number): any {
    this.ASSET_INFO_CONTAINER =
      index === undefined ? this.ASSET_INFO_CONTAINER : `${this.ASSET_INFO_CONTAINER}[${index}]`;
  }

  setBundleRow(index?: number): any {
    this.BUNDLE_ROW = index === undefined ? this.BUNDLE_ROW : `${this.BUNDLE_ROW}[${index}]`;
  }

  mainTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.MAIN_TITLE}`, 'xpath');
  }

  subTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.SUBTITLE}`, 'xpath');
  }

  bundleRow(index?: number): WebElement {
    this.setBundleRow(index);
    return Factory.fromSelector(`${this.BUNDLE_ROW}`, 'xpath');
  }

  recipientTitle(bundleIndex?: number): WebElement {
    return Factory.fromSelector(`${this.bundleRow(bundleIndex).toJSLocator()}${this.RECIPIENT_TITLE}`, 'xpath');
  }

  bundleRowTitle(index?: number): WebElement {
    this.setBundleRow(index);
    return Factory.fromSelector(`${this.BUNDLE_ROW}${this.BUNDLE_ROW_TITLE}`, 'xpath');
  }

  recipientAddress(bundleIndex?: number, assetRowIndex?: number): WebElement {
    this.setAssetRow(assetRowIndex);
    return Factory.fromSelector(
      `${this.bundleRow(bundleIndex).toJSLocator()}${this.ASSET_INFO_CONTAINER}${this.RECIPIENT_ADDRESS}`,
      'xpath'
    );
  }

  sendingTitle(bundleIndex?: number): WebElement {
    return Factory.fromSelector(`${this.bundleRow(bundleIndex).toJSLocator()}${this.SENDING_TITLE}`, 'xpath');
  }

  sendingValueAda(bundleIndex?: number, assetRowIndex?: number): WebElement {
    this.setAssetRow(assetRowIndex);
    return Factory.fromSelector(
      `${this.bundleRow(bundleIndex).toJSLocator()}${this.ASSET_INFO_CONTAINER}${this.ASSET_INFO_VALUE}`,
      'xpath'
    );
  }

  sendingValueFiat(bundleIndex?: number, assetRowIndex?: number): WebElement {
    this.setAssetRow(assetRowIndex);
    return Factory.fromSelector(
      `${this.bundleRow(bundleIndex).toJSLocator()}${this.ASSET_INFO_CONTAINER}${this.ASSET_INFO_FIAT}`,
      'xpath'
    );
  }

  feeTitle(): WebElement {
    return Factory.fromSelector(`${this.CONTAINER}${this.FEE_TITLE}`, 'xpath');
  }

  feeValueAda(): WebElement {
    return Factory.fromSelector(`${this.FEE_CONTAINER}${this.ASSET_INFO_VALUE}`, 'xpath');
  }

  feeValueFiat(): WebElement {
    return Factory.fromSelector(`${this.FEE_CONTAINER}${this.ASSET_INFO_FIAT}`, 'xpath');
  }

  metadataTitle(): WebElement {
    return Factory.fromSelector(`${this.METADATA_CONTAINER}${this.METADATA_LABEL}`, 'xpath');
  }

  metadataValue(): WebElement {
    return Factory.fromSelector(`${this.METADATA_CONTAINER}${this.METADATA_VALUE}`, 'xpath');
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  async getMainTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.mainTitle());
  }

  async getSubTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.subTitle());
  }

  async getFeeTitle(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.feeTitle());
  }

  async getFeeValueAda(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.feeValueAda());
  }

  async getFeeValueFiat(): Promise<string | number> {
    return await webTester.getTextValueFromElement(this.feeValueFiat());
  }

  toJSLocator(): string {
    return this.CONTAINER;
  }

  locatorStrategy(): LocatorStrategy {
    return 'xpath';
  }
}
