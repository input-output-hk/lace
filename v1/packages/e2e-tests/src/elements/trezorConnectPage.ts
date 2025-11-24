/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

class TrezorConnectPage {
  private CONFIRM_BUTTON = '[data-testid="@permissions/confirm-button"]';
  private EXPORT_BUTTON = '[id="container"] .confirm';
  private ANALYTICS_CONFIRM_BUTTON = '[data-testid="@analytics/continue-button"]';
  private ANALYTICS_TOGGLE_BUTTON = '[data-testid="@analytics/toggle-switch"]';
  private SHADOW_ROOT = '#react';

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get analyticsConfirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHADOW_ROOT).shadow$(this.ANALYTICS_CONFIRM_BUTTON);
  }

  get analyticsToggleButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SHADOW_ROOT).shadow$(this.ANALYTICS_TOGGLE_BUTTON);
  }

  get exportButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EXPORT_BUTTON);
  }

  async clickOnConfirmButton(): Promise<void> {
    await this.confirmButton.waitForClickable();
    await this.confirmButton.click();
  }

  async clickOnAnalyticsConfirmButton(): Promise<void> {
    await this.analyticsConfirmButton.waitForClickable();
    await this.analyticsConfirmButton.click();
  }

  async clickOnAnalyticsToggleButton(): Promise<void> {
    await this.analyticsToggleButton.waitForClickable();
    await this.analyticsToggleButton.click();
  }

  async clickOnExportButton(): Promise<void> {
    await this.exportButton.waitForClickable();
    await this.exportButton.click();
  }
}
export default new TrezorConnectPage();
