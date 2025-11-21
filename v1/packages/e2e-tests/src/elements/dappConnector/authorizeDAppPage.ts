/* eslint-disable no-undef */
import Banner from '../banner';
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import CommonDappPageElements from './commonDappPageElements';

class AuthorizeDAppPage extends CommonDappPageElements {
  private PERMISSIONS_TITLE = '[data-testid="authorize-dapp-title"]';
  private PERMISSIONS_LIST = '[data-testid="authorize-dapp-permissions"]';
  private AUTHORIZE_BUTTON = '[data-testid="connect-authorize-button"]';
  private CANCEL_BUTTON = '[data-testid="connect-cancel-button"]';

  get banner(): typeof Banner {
    return Banner;
  }

  get permissionsTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PERMISSIONS_TITLE);
  }

  get permissionsList(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PERMISSIONS_LIST);
  }

  get permissionsListItems(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(`${this.PERMISSIONS_LIST} li`);
  }

  get authorizeButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AUTHORIZE_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }

  async clickButton(button: 'Authorize' | 'Cancel'): Promise<void> {
    await this.authorizeButton.waitForClickable();
    button === 'Authorize' ? await this.authorizeButton.click() : await this.cancelButton.click();
  }
}

export default new AuthorizeDAppPage();
