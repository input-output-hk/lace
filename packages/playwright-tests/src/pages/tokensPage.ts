import { Locator, Page } from '@playwright/test';

import { LaceBasePage } from './laceBasePage';

export class TokensPage extends LaceBasePage {
  readonly tokenAmountElement: (tokenName: string) => Locator;
  constructor(page: Page) {
    super(page);
    this.tokenAmountElement = (tokenName: string) =>
      page.locator(
        `//p[@data-testid="token-table-cell-ticker" and text()="${tokenName}"]//ancestor::tr/td[3]//p[@data-testid="token-table-cell-balance"]`
      );
  }

  async goto(): Promise<TokensPage> {
    const baseUrl = this.getBaseUrlFromCurrentUrl();
    await this.page.goto(`${baseUrl}/tokens`);
    return new TokensPage(this.page);
  }

  async getTokenAmount(token: string): Promise<number> {
    const tokenAmountString = (await this.tokenAmountElement(token).textContent()) as string;
    const cleanedString = tokenAmountString.replace(/,/g, '');
    return Number.parseFloat(cleanedString);
  }
}
