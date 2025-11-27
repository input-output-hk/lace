/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class SubscriptionsDropdown {
  private readonly DROPDOWN_MENU = '[data-testid="subscriptions-dropdown"]';
  private readonly DROPDOWN_DESCRIPTION = '[data-testid="subscriptions-dropdown-description"]';

  get dropdownDescription(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DROPDOWN_DESCRIPTION);
  }

  private getTopicToggleSwitchSelector(topicId: string): string {
    return `[data-testid="subscriptions-${topicId}-toggle-switch"]`;
  }

  get dropdownMenu(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DROPDOWN_MENU);
  }

  getTopicToggleSwitch(topicId: string): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.getTopicToggleSwitchSelector(topicId));
  }

  async getDropdownDescriptionText(): Promise<string> {
    return await this.dropdownDescription.getText();
  }

  async isTopicSubscribed(topicId: string): Promise<boolean> {
    const toggleSwitch = this.getTopicToggleSwitch(topicId);
    const ariaChecked = await toggleSwitch.getAttribute('aria-checked');
    return ariaChecked === 'true';
  }

  async toggleTopic(topicId: string): Promise<void> {
    const toggleSwitch = this.getTopicToggleSwitch(topicId);
    await toggleSwitch.waitForClickable();
    await toggleSwitch.click();
  }

  async enableTopic(topicId: string): Promise<void> {
    const isSubscribed = await this.isTopicSubscribed(topicId);
    if (!isSubscribed) {
      await this.toggleTopic(topicId);
    }
  }

  async disableTopic(topicId: string): Promise<void> {
    const isSubscribed = await this.isTopicSubscribed(topicId);
    if (isSubscribed) {
      await this.toggleTopic(topicId);
    }
  }
}

export default new SubscriptionsDropdown();
