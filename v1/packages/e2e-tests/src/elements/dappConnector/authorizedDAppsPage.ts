/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import { ChainablePromiseArray } from 'webdriverio/build/types';
import CommonDrawerElements from '../CommonDrawerElements';

class AuthorizedDAppsPage extends CommonDrawerElements {
  private SUBTITLE = '[data-testid="dapp-list-subtitle"]';
  private EMPTY_STATE_IMAGE = '[data-testid="dapp-list-empty-image"]';
  private EMPTY_STATE_TEXT = '[data-testid="dapp-list-empty-text"]';
  private DAPP_CONTAINER = '[data-testid="dapp-container-id"]';
  private DAPP_LOGO = '[data-testid="connected-dapp-logo"]';
  private DAPP_NAME = '[data-testid="connected-dapp-name"]';
  private DAPP_URL = '[data-testid="connected-dapp-url"]';
  private DAPP_DELETE_ICON = '[data-testid="dapp-delete-icon-id"]';

  get drawerHeaderSubtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get emptyStateImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_IMAGE);
  }

  get emptyStateText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_TEXT);
  }

  get dAppContainers(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DAPP_CONTAINER);
  }

  get dAppLogos(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DAPP_LOGO);
  }

  get dAppNames(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DAPP_NAME);
  }

  get dAppUrls(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DAPP_URL);
  }

  get dAppRemoveButtons(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.DAPP_DELETE_ICON);
  }
}

export default new AuthorizedDAppsPage();
