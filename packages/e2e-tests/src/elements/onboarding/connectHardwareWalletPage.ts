/* eslint-disable no-undef*/
import CommonOnboardingElements from './commonOnboardingElements';
import { ChainablePromiseElement } from 'webdriverio';

export class OnboardingConnectHardwareWalletPage extends CommonOnboardingElements {
  private SUBTITLE_TEXT = '[data-testid="connect-hardware-wallet-subtitle"]';
  private SUPPORTED_DEVICES_TEXT = '[data-testid="connect-hardware-wallet-supported-devices-text"]';
  private LEDGER_BUTTON = '[data-testid="connect-hardware-wallet-button-ledger"]';
  private TREZOR_BUTTON = '[data-testid="connect-hardware-wallet-button-trezor"]';

  private CONNECT_DEVICE_TEXT = '[data-testid="connect-hardware-wallet-connect-device-text"]';

  get subTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE_TEXT);
  }

  get supportedDevices(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUPPORTED_DEVICES_TEXT);
  }

  get ledgerButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LEDGER_BUTTON);
  }

  get trezorButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TREZOR_BUTTON);
  }

  get connectDevice(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONNECT_DEVICE_TEXT);
  }
}

export default new OnboardingConnectHardwareWalletPage();
