/* eslint-disable no-undef */

import CommonDrawerElements from './CommonDrawerElements';

class TokenDetailsPage extends CommonDrawerElements {
  private TOKEN_LOGO = '[data-testid="token-logo"]';
  private TOKEN_NAME = '[data-testid="token-name"]';
  private TOKEN_TICKER = '[data-testid="token-ticker"]';

  private TOKEN_PRICE_COMPONENT = '[data-testid="token-price"]';
  private TOKEN_BALANCE_COMPONENT = '[data-testid="token-balance"]';
  private BALANCE_LABEL = '[data-testid="portfolio-balance-label"]';
  private BALANCE_CURRENCY = '[data-testid="portfolio-balance-currency"]';
  private BALANCE_VALUE = '[data-testid="portfolio-balance-value"]';
  private BALANCE_SUBTITLE = '[data-testid="portfolio-balance-subtitle"]';

  private TRANSACTIONS_LIST_TITLE = '[data-testid="asset-activity-list-title"]';
  private TRANSACTION_ITEM = '[data-testid="asset-activity-item"]';

  private VIEW_ALL_BUTTON = '[data-testid="view-all-button"]';

  get tokenLogo() {
    return $(this.TOKEN_LOGO);
  }

  get tokenName() {
    return $(this.TOKEN_NAME);
  }

  get tokenTicker() {
    return $(this.TOKEN_TICKER);
  }

  get tokenPriceLabel() {
    return this.drawerBody.$(this.TOKEN_PRICE_COMPONENT).$(this.BALANCE_LABEL);
  }

  get tokenPriceValue() {
    return this.drawerBody.$(this.TOKEN_PRICE_COMPONENT).$(this.BALANCE_VALUE);
  }

  get tokenPriceCurrency() {
    return this.drawerBody.$(this.TOKEN_PRICE_COMPONENT).$(this.BALANCE_CURRENCY);
  }

  get tokenPriceChange() {
    return this.drawerBody.$(this.TOKEN_PRICE_COMPONENT).$(this.BALANCE_SUBTITLE);
  }

  get tokenBalanceLabel() {
    return this.drawerBody.$(this.TOKEN_BALANCE_COMPONENT).$(this.BALANCE_LABEL);
  }

  get tokenBalanceValue() {
    return this.drawerBody.$(this.TOKEN_BALANCE_COMPONENT).$(this.BALANCE_VALUE);
  }

  get tokenBalanceCurrency() {
    return this.drawerBody.$(this.TOKEN_BALANCE_COMPONENT).$(this.BALANCE_CURRENCY);
  }

  get tokenFiatBalance() {
    return this.drawerBody.$(this.TOKEN_BALANCE_COMPONENT).$(this.BALANCE_SUBTITLE);
  }

  get transactionsListTitle() {
    return $(this.TRANSACTIONS_LIST_TITLE);
  }

  get viewAllButton() {
    return $(this.VIEW_ALL_BUTTON);
  }

  get transactionsListItems(): Promise<WebdriverIO.ElementArray> {
    return $$(this.TRANSACTION_ITEM);
  }

  async clickOnViewAllButton() {
    await this.viewAllButton.click();
  }
}

export default new TokenDetailsPage();
