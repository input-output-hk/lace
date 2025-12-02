/* eslint-disable no-undef */
import type { ChainablePromiseElement, ElementArray } from 'webdriverio';
import type { ChainablePromiseArray } from 'webdriverio/build/types';
import type { DAppCategories } from '../../types/dappCategories';

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
  private readonly EMPTY_STATE_IMAGE = '[data-testid="empty-state-image"]';
  private readonly EMPTY_STATE_HEADER = '[data-testid="empty-state-header"]';
  private readonly EMPTY_STATE_TEXT = '[data-testid="empty-state-text"]';
  private readonly EMPTY_STATE_TEXT_2 = '[data-testid="empty-state-text-2"]';

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

  get emptyStateImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_IMAGE);
  }

  get emptyStateHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_HEADER);
  }

  get emptyStateText(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_TEXT);
  }

  get emptyStateText2(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EMPTY_STATE_TEXT_2);
  }

  async hoverOverInfoIcon() {
    await this.infoIcon.scrollIntoView();
    await this.infoIcon.moveTo();
  }

  async clickOnCategoryButton(category: DAppCategories | 'Show All'): Promise<void> {
    switch (category) {
      case 'Show All':
        await this.categoryShowAll.scrollIntoView();
        await this.categoryShowAll.click();
        break;
      case 'Games':
        await this.categoryGames.scrollIntoView();
        await this.categoryGames.click();
        break;
      case 'Defi':
        await this.categoryDefi.scrollIntoView();
        await this.categoryDefi.click();
        break;
      case 'Collectibles':
        await this.categoryCollectibles.scrollIntoView();
        await this.categoryCollectibles.click();
        break;
      case 'Marketplaces':
        await this.categoryMarketplaces.scrollIntoView();
        await this.categoryMarketplaces.click();
        break;
      case 'Exchanges':
        await this.categoryExchanges.scrollIntoView();
        await this.categoryExchanges.click();
        break;
      case 'Social':
        await this.categorySocial.scrollIntoView();
        await this.categorySocial.click();
        break;
      case 'Other':
        await this.categoryOther.scrollIntoView();
        await this.categoryOther.click();
        break;
      default:
        throw new Error(`Unsupported category: ${category}`);
    }
  }
}

export default new DAppExplorerPage();
