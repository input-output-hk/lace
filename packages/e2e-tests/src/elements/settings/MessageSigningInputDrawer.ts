/* eslint-disable no-undef */
import CommonDrawerElements from '../CommonDrawerElements';
import type { ChainablePromiseElement } from 'webdriverio';
import type { ChainablePromiseArray } from 'webdriverio/build/types';
import testContext from '../../utils/testContext';

class MessageSigningInputDrawer extends CommonDrawerElements {
  private TITLE = '[data-testid="drawer-header-title"]';
  private SUBTITLE = '[data-testid="drawer-header-subtitle"]';
  private ADDRESS_LABEL = '[data-testid="address-label"]';
  private SELECT_ADDRESS_BUTTON = '[data-testid="select-address-button"]';
  private MESSAGE_TO_SIGN_LABEL = '[data-testid="message-to-sign-label"]';
  private MESSAGE_INPUT = '[data-testid="sign-message-input"]';
  private SIGN_MESSAGE_BUTTON = '[data-testid="sign-message-button"]';
  private CLOSE_BUTTON = '[data-testid="close-button"]';
  private ADDRESS_MENU = '.ant-dropdown-menu';
  private ADDRESS_ITEM = '.ant-dropdown-menu-item';

  get drawerHeaderTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get drawerHeaderSubtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get addressLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS_LABEL);
  }

  get selectAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SELECT_ADDRESS_BUTTON);
  }

  get messageToSignLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MESSAGE_TO_SIGN_LABEL);
  }

  get messageInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MESSAGE_INPUT);
  }

  get signMessageButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SIGN_MESSAGE_BUTTON);
  }

  get closeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CLOSE_BUTTON);
  }

  get addressMenu(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ADDRESS_MENU);
  }

  get addresses(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.ADDRESS_ITEM);
  }

  async clickOnSelectAddressButton(): Promise<void> {
    await this.selectAddressButton.waitForClickable();
    await this.selectAddressButton.click();
  }

  async selectRandomAddress(): Promise<void> {
    await this.addressMenu.waitForClickable();
    const numberOfAddresses = await this.addresses.length;
    const index = Math.floor(Math.random() * numberOfAddresses);
    const selectedAddress = await this.addresses[index].getText();
    testContext.save('selectedAddress', selectedAddress);
    await this.addresses[index].click();
  }

  async fillMessageField(message: string): Promise<void> {
    await this.messageInput.waitForClickable();
    await this.messageInput.setValue(message);
  }

  async clickOnSignMessageButton(): Promise<void> {
    await this.signMessageButton.waitForClickable();
    await this.signMessageButton.click();
  }
}

export default new MessageSigningInputDrawer();
