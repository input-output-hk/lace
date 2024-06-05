import { Locator, Page } from '@playwright/test';

import { BasePage } from './../basePage';

export type TokenItem = {
  name: string;
  ticker: string;
  balance: string;
};

export class TokenItemElement extends BasePage {
  readonly name: Locator;
  readonly ticker: Locator;
  readonly balance: Locator;

  constructor(page: Page, locator: Locator) {
    super(page);
    this.name = locator.locator('//td[1]//p[@data-testid="asset-table-cell-title"]');
    this.ticker = locator.locator('//td[1]//p[@data-testid="asset-table-cell-subtitle"]');
    this.balance = locator.locator('//td[3]//p[@data-testid="asset-table-cell-title"]');
  }

  async goto(): Promise<TokenItemElement> {
    await this.page.goto('/tokens');
    return this;
  }

  async getTokenItemValues(): Promise<TokenItem> {
    return {
      name: (await this.name.textContent()) as string,
      ticker: (await this.ticker.textContent()) as string,
      balance: (await this.balance.textContent()) as string
    };
  }
}
