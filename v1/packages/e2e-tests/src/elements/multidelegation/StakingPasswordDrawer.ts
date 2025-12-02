/* eslint-disable no-undef */
import PasswordInput from '../passwordInput';
import CommonDrawerElements from '../CommonDrawerElements';
import { ChainablePromiseElement } from 'webdriverio';

class StakingPasswordDrawer extends CommonDrawerElements {
  private TITLE = '[data-testid="staking-confirmation-title"]';
  private SUBTITLE = '[data-testid="staking-confirmation-subtitle"]';
  private CONFIRM_BUTTON = '[data-testid="stake-sign-confirmation-btn"]';
  private LOADER = '[data-testid="btn-loader-container"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get passwordInputContainer() {
    return PasswordInput.container;
  }

  get loader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOADER);
  }

  async fillPassword(password: string) {
    await PasswordInput.input.waitForClickable();
    await PasswordInput.input.setValue(password);
  }

  async confirmStaking() {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
    await this.loader.waitForDisplayed({ reverse: true, timeout: 30_000 });
  }
}

export default new StakingPasswordDrawer();
