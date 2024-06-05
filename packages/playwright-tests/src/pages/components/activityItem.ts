import { Locator, Page } from '@playwright/test';

import { convertToUTC } from './../../utils/helperFunctions';
import { TransactionToken } from './../../utils/types';
import { BasePage } from './../basePage';

export type ActivityItem = {
  actionType: string;
  tokens: TransactionToken[];
  amountUSD: string;
  time: Date;
  date: Date;
};

export class ActivityItemElement extends BasePage {
  readonly container: Locator;
  readonly actionType: Locator;
  readonly amountToken: Locator;
  readonly amountUSD: Locator;
  readonly time: Locator;
  readonly date: Locator;

  constructor(page: Page, locator: Locator) {
    super(page);
    this.container = locator;
    this.actionType = locator.locator('h6[data-testid="transaction-type"]');
    this.amountToken = locator.locator('h6[data-testid="total-amount"]>span');
    this.amountUSD = locator.locator('p[data-testid="fiat-amount"]');
    this.time = locator.locator('p[data-testid="timestamp"]');
    this.date = locator.locator(
      '//ancestor::li[@data-testid="grouped-asset-activity-list-item"]//p[@data-testid="transaction-date"]'
    );
  }

  async goto(): Promise<ActivityItemElement> {
    await this.page.goto('/activity');
    return this;
  }

  async getActivityItemValues(): Promise<ActivityItem> {
    const dateString = (await this.date.textContent()) as string;
    let date: Date;
    if (dateString === 'Sending' || dateString === 'Today') {
      const localDate = new Date();
      date = convertToUTC(localDate);
    } else {
      const localDate = new Date(Date.parse(dateString));
      date = convertToUTC(localDate);
    }
    const timeString = (await this.time.textContent()) as string;
    const localTime = new Date(Date.parse(`${date.toDateString()} ${timeString.split(' ')[0]}`));
    const tokens = await this.getTokens();
    return {
      actionType: (await this.actionType.textContent()) as string,
      tokens,
      amountUSD: (await this.amountUSD.textContent()) as string,
      date,
      time: localTime
    };
  }

  private async getTokens(): Promise<TransactionToken[]> {
    await this.container.locator('h6[data-testid="total-amount"]>span>span').waitFor({ state: 'detached' });
    const tokensString = (await this.amountToken.textContent()) as string;
    const tokens = tokensString.split(',');
    const tokensList: TransactionToken[] = [];
    for (const token of tokens) {
      const tokenName = token.trim().split(' ')[1];
      const tokenAmount = token.trim().split(' ')[0];
      tokensList.push({
        name: tokenName,
        amount: Number.parseFloat(tokenAmount),
        ticker: ''
      });
    }
    return tokensList;
  }
}
