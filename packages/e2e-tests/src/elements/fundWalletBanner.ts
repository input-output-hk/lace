/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class FundWalletBanner {
  private CONTAINER = '//div[@data-testid="fund-wallet-banner"]';
  private QR_CODE = '//div[@data-testid="qr-code"]';
  private BANNER_TITLE = '//h1[@data-testid="fund-wallet-banner-title"]';
  private BANNER_SUBTITLE = '//h2[@data-testid="fund-wallet-banner-subtitle"]';
  private BANNER_PROMPT = '//h5[@data-testid="fund-wallet-banner-prompt"]';
  private WALLET_ADDRESS = '//p[@data-testid="info-wallet-full-address"]';
  private COPY_ADDRESS_BUTTON = '//button[@data-testid="copy-address"]';

  get qrCode(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.QR_CODE}`);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.BANNER_TITLE}`);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.BANNER_SUBTITLE}`);
  }

  get prompt(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.BANNER_PROMPT}`);
  }

  get walletAddress(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.WALLET_ADDRESS}`);
  }

  get copyAddressButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(`${this.CONTAINER}${this.COPY_ADDRESS_BUTTON}`);
  }

  async getTitle(): Promise<string> {
    return await this.title.getText();
  }

  async getSubtitle(): Promise<string> {
    return await this.subtitle.getText();
  }

  async getPrompt(): Promise<string> {
    return await this.prompt.getText();
  }

  async getWalletAddress(): Promise<string> {
    return await this.walletAddress.getText();
  }
}

export default new FundWalletBanner();
