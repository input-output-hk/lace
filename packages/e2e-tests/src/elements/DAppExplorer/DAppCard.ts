/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class DAppCard {
  private readonly CARD_ICON = '[data-testid="dapp-card-icon"]';
  private readonly CARD_TITLE = '[data-testid="dapp-card-title"]';
  private readonly CARD_CATEGORY = '[data-testid="dapp-card-category"]';
  protected card: ChainablePromiseElement<WebdriverIO.Element | undefined>;

  constructor(dappName: string) {
    this.card = $(`[data-testid="dapp-grid-app-card-${dappName}"]`);
  }

  get container(): ChainablePromiseElement<WebdriverIO.Element | undefined> {
    return this.card;
  }

  get icon(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.CARD_ICON);
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.CARD_TITLE);
  }

  get category(): ChainablePromiseElement<WebdriverIO.Element> {
    return this.card.$(this.CARD_CATEGORY);
  }

  async click(): Promise<void> {
    await this.card.scrollIntoView();
    await this.card.waitForClickable();
    await this.card.click();
  }
}
