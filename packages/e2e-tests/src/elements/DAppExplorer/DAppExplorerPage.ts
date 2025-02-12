/* eslint-disable no-undef */
import type { ChainablePromiseElement, ElementArray } from 'webdriverio';
import type { ChainablePromiseArray } from 'webdriverio/build/types';

class DAppExplorerPage {
  private readonly PAGE_TITLE = '[data-testid="page-title"]';
  private readonly INFO_ICON = '[data-testid="info-icon"]';
  private readonly INFO_TOOLTIP = '[data-testid="tooltip-content"]';
  private readonly SHOW_ALL = '[data-testid="classic-filter-all"]';
  private readonly GAMES = '[data-testid="classic-filter-games"]';
  private readonly DEFI = '[data-testid="classic-filter-defi"]';
  private readonly COLLECTIBLES = '[data-testid="classic-filter-collectibles"]';
  private readonly MARKETPLACES = '[data-testid="classic-filter-marketplaces"]';
  private readonly EXCHANGES = '[data-testid="classic-filter-exchanges"]';
  private readonly SOCIAL = '[data-testid="classic-filter-social"]';
  private readonly OTHER = '[data-testid="classic-filter-other"]';
  private readonly SCROLL_PREV_BUTTON = '[data-testid="scroll-prev"]';
  private readonly SCROLL_NEXT_BUTTON = '[data-testid="scroll-next"]';
  private readonly DAPP_CARD_CONTAINER = '.card-container';
  private readonly SKELETON = '[data-testid="skeleton"]';

  get pageTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PAGE_TITLE);
  }

  get infoIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INFO_ICON);
  }

  get infoTooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.INFO_TOOLTIP);
  }

  get categoryShowAll(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHOW_ALL);
  }

  get categoryGames(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.GAMES);
  }

  get categoryDefi(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DEFI);
  }

  get categoryCollectibles(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COLLECTIBLES);
  }

  get categoryMarketplaces(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MARKETPLACES);
  }

  get categoryExchanges(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EXCHANGES);
  }

  get categorySocial(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SOCIAL);
  }

  get categoryOther(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OTHER);
  }

  get scrollPrevButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SCROLL_PREV_BUTTON);
  }

  get scrollNextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SCROLL_NEXT_BUTTON);
  }

  get dappCards(): ChainablePromiseArray<ElementArray> {
    return $$(this.DAPP_CARD_CONTAINER);
  }

  get skeleton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SKELETON);
  }

  async hoverOverInfoIcon() {
    await this.infoIcon.scrollIntoView();
    await this.infoIcon.moveTo();
  }
}

export default new DAppExplorerPage();
