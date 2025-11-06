/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class NotificationsEmptyState {
  private readonly EMPTY_STATE_IMAGE = '[data-testid="empty-state-image"]';
  private readonly EMPTY_STATE_TITLE = '[data-testid="empty-state-title"]';
  private readonly EMPTY_STATE_DESCRIPTION = '[data-testid="empty-state-description"]';

  private static readonly ANT_DROPDOWN_MENU = '.ant-dropdown-menu';
  private static readonly PAGE_CONTENT = ':is(#content, #contentLayout)';

  private readonly location: 'menu' | 'page';

  constructor(location: 'menu' | 'page') {
    this.location = location;
  }

  private getSelector(elementSelector: string): string {
    const wrapper =
      this.location === 'menu' ? NotificationsEmptyState.ANT_DROPDOWN_MENU : NotificationsEmptyState.PAGE_CONTENT;
    return `${wrapper} ${elementSelector}`;
  }

  get emptyStateImage(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.EMPTY_STATE_IMAGE));
  }

  get emptyStateTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.EMPTY_STATE_TITLE));
  }

  get emptyStateDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getSelector(this.EMPTY_STATE_DESCRIPTION));
  }

  async getTitle(): Promise<string> {
    return await this.emptyStateTitle.getText();
  }

  async getDescription(): Promise<string> {
    return await this.emptyStateDescription.getText();
  }
}

export default NotificationsEmptyState;
