/* eslint-disable no-undef */
import SectionTitle from '../sectionTitle';
import { WebElement, WebElementFactory as Factory } from './../webElement';
import { ChainablePromiseElement } from 'webdriverio';

export class StakingPage extends WebElement {
  private SEARCH_BAR = '//div[@data-testid="stakepool-search-bar"]';
  private SEARCH_ICON = '[data-testid="search-icon"]';
  private SEARCH_INPUT = '//*[@data-testid="search-input"]//descendant::input|//input[@data-testid="search-input"]';
  private STAKEPOOL_LIST_HEADER = '//div[@data-testid="stake-pool-list-header"]';
  private STAKE_POOL_LIST_HEADER_TEMPLATE = '//div[@data-testid="stake-pool-list-header-###COLUMN_NAME###"]';

  constructor() {
    super();
  }

  headerControlWithText(listHeader: string): WebElement {
    return Factory.fromSelector(`${this.STAKEPOOL_LIST_HEADER}//p[text() = '${listHeader}']//span`, 'xpath');
  }

  stakingPoolListColumnHeader(listHeader: string): WebElement {
    const headerColumnSelector = this.STAKE_POOL_LIST_HEADER_TEMPLATE.replace(
      '###COLUMN_NAME###',
      listHeader === 'ros' ? 'apy' : listHeader
    );
    return Factory.fromSelector(`${headerColumnSelector}`, 'xpath');
  }

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionTitle;
  }

  get counter(): ChainablePromiseElement<WebdriverIO.Element> {
    return SectionTitle.sectionCounter;
  }

  stakingPopupSearchBar(): WebElement {
    return Factory.fromSelector(`${this.SEARCH_BAR}`, 'xpath');
  }

  stakingPageSearchIcon(): WebElement {
    return Factory.fromSelector(`${this.SEARCH_ICON}`, 'xpath');
  }

  stakingPageSearchInput(): WebElement {
    return Factory.fromSelector(`${this.SEARCH_INPUT}`, 'xpath');
  }

  stakingPopupPoolWithName(poolName: string): WebElement {
    return Factory.fromSelector(`//h6[text() = '${poolName}']`, 'xpath');
  }
}
