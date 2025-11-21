/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';
import type { ChainablePromiseArray } from 'webdriverio/build/types';
import CommonDrawerElements from '../CommonDrawerElements';

class DAppInfoDrawer extends CommonDrawerElements {
  private readonly DAPP_ICON = '[data-testid="dapp-info-drawer-icon"] img';
  private readonly DAPP_TITLE = '[data-testid="dapp-info-drawer-title"]';
  private readonly DAPP_CATEGORIES = '[data-testid="dapp-info-drawer-categories"]';
  private readonly MORE_DETAILS_TAB_BUTTON = '#rc-tabs-0-tab-1';
  private readonly CONTACT_TAB_BUTTON = '#rc-tabs-0-tab-2';
  private readonly SUMMARY_LABEL = '[data-testid="dapp-short-description-label"]';
  private readonly SUMMARY_TEXT = '[data-testid="dapp-short-description-text"]';
  private readonly DESCRIPTION_LABEL = '[data-testid="dapp-long-description-label"]';
  private readonly DESCRIPTION_TEXT = '[data-testid="dapp-long-description-text"]';
  private readonly CONTACT_ITEM = '[data-testid="contact-item"]';
  private readonly OPEN_BUTTON = '[data-testid="open-dapp-url-button"]';

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DAPP_ICON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DAPP_TITLE);
  }

  get categories(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DAPP_CATEGORIES);
  }

  get moreDetailsTabButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MORE_DETAILS_TAB_BUTTON);
  }

  get contactTabButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTACT_TAB_BUTTON);
  }

  get summaryLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUMMARY_LABEL);
  }

  get summaryText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUMMARY_TEXT);
  }

  get descriptionLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION_LABEL);
  }

  get descriptionText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION_TEXT);
  }

  get contactItems(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.CONTACT_ITEM);
  }

  get dappOpenButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OPEN_BUTTON);
  }
}

export default new DAppInfoDrawer();
