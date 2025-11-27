/* eslint-disable no-undef */
import CommonDrawerElements from './CommonDrawerElements';
import { ChainablePromiseElement } from 'webdriverio';
import Banner from './banner';
import testContext from '../utils/testContext';

class WalletAddressPage extends CommonDrawerElements {
  private ADDRESS_CARD = '[data-testid="address-card"]';
  private WALLET_NAME = '[data-testid="address-card-name"]';
  private TOOLTIP = '.ant-tooltip';
  public ADDRESS_CARD_TITLE = '[data-testid="address-card-title"]';
  public ADDRESS_CARD_TITLE_INFO_ICON = '[data-testid="address-card-title-info-icon"]';
  public QR_CODE = '[data-testid="qr-code"]';
  public WALLET_ADDRESS = '[data-testid="address-card-address"]';
  public COPY_BUTTON = '[data-testid="copy-address-btn"]';
  public HANDLE_NAME = '[data-testid="address-card-handle-name"]';
  public HANDLE_IMAGE = '[data-testid="address-card-handle-image"]';
  public HANDLE_SYMBOL = '[data-testid="address-card-handle-symbol"]';
  public ADV_MODE_TOGGLE_LABEL = '[data-testid="advanced-mode-toggle-label"]';
  public ADV_MODE_TOGGLE_ICON = '[data-testid="advanced-mode-toggle-icon"]';
  public ADV_MODE_TOGGLE_SWITCH = '[data-testid="advanced-mode-toggle-switch"]';
  public ADDRESS_ASSETS = '[data-testid="address-card-assets"]';
  public ADDRESS_ADA_ICON = '[data-testid="address-ada-icon"]';
  public ADDRESS_ADA_VALUE = '[data-testid="address-ada-label"]';
  public ADDRESS_TOKENS_ICON = '[data-testid="address-tokens-icon"]';
  public ADDRESS_TOKENS_COUNT = '[data-testid="address-tokens-label"]';
  public ADDRESS_TOKENS_CHEVRON = '[data-testid="address-tokens-chevron"]';
  public ADDITIONAL_ADDRESSES_DIVIDER = '[data-testid="additional-addresses-divider"]';
  public UNUSED_ADDRESS_INFO_ICON = '[data-testid="address-card-unused-address-icon"]';
  public UNUSED_ADDRESS_INFO_LABEL = '[data-testid="address-card-unused-address-label"]';
  public ADD_NEW_ADDRESS_BUTTON = '[data-testid="add-new-address-button"]';

  get addressCard(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS_CARD);
  }

  get handleNames(): Promise<WebdriverIO.ElementArray> {
    return $$(this.HANDLE_NAME);
  }

  get handleImages(): Promise<WebdriverIO.ElementArray> {
    return $$(this.HANDLE_IMAGE);
  }

  get addressCards(): Promise<WebdriverIO.ElementArray> {
    return $$(this.ADDRESS_CARD);
  }

  get qrCode(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.QR_CODE);
  }

  get walletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME);
  }

  get walletAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_ADDRESS);
  }

  get copyButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COPY_BUTTON);
  }

  get advancedModeToggleLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADV_MODE_TOGGLE_LABEL);
  }

  get advancedModeToggleIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADV_MODE_TOGGLE_ICON);
  }

  get advancedModeToggleSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADV_MODE_TOGGLE_SWITCH);
  }

  get additionalAddressesDivider(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDITIONAL_ADDRESSES_DIVIDER);
  }

  get addNewAddressBanner(): typeof Banner {
    return Banner;
  }

  get addNewAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADD_NEW_ADDRESS_BUTTON);
  }

  get tooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TOOLTIP);
  }

  async getHandleAddressCard(handleName: string): Promise<WebdriverIO.Element> {
    if ((await this.handleNames).length > 0) {
      return (await (
        await this.addressCards
      ).find(async (item) => (await item.$(this.HANDLE_NAME).getText()) === handleName)) as WebdriverIO.Element;
    }
    return undefined as unknown as WebdriverIO.Element;
  }

  async clickCopyButtonForHandle(handleName: string) {
    const addressCard = await this.getHandleAddressCard(handleName);
    await addressCard.waitForStable();
    await addressCard.scrollIntoView();
    await addressCard.moveTo();
    await addressCard.$(this.COPY_BUTTON).click();
  }

  async clickAdvancedModeToggle() {
    await this.advancedModeToggleSwitch.waitForClickable();
    await this.advancedModeToggleSwitch.click();
  }

  async clickAddNewAddressButton() {
    await this.addNewAddressButton.waitForClickable();
    await this.addNewAddressButton.click();
  }

  async getLastAddress() {
    const lastCard = (await this.addressCards)[(await this.addressCards).length - 1];
    return await lastCard.$(this.WALLET_ADDRESS).getText();
  }

  async saveLastAddress() {
    const lastAddress = await this.getLastAddress();
    testContext.save('lastAddress', lastAddress);
  }

  async getSavedLastAddress(): Promise<string> {
    return testContext.load('lastAddress');
  }

  async clickCopyButtonOnAddressCard(index: number) {
    const card = (await this.addressCards)[index];
    await card.$(this.COPY_BUTTON).click();
  }

  async saveAddressForCard(index: number) {
    const card = (await this.addressCards)[index];
    const address = await card.$(this.WALLET_ADDRESS).getText();
    testContext.save('address', address);
  }

  async hoverOverAdvancedModeToggleIcon() {
    await this.advancedModeToggleIcon.waitForDisplayed();
    await this.advancedModeToggleIcon.waitForStable();
    await this.advancedModeToggleIcon.moveTo();
  }
}

export default new WalletAddressPage();
