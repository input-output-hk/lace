/* global WebdriverIO */
import type { ChainablePromiseElement } from 'webdriverio';

class ForgotPasswordModal {
  private readonly TITLE = '[data-testid="forgot-password-title"]';
  private readonly DESCRIPTION = '[data-testid="forgot-password-description"]';
  private readonly CONFIRM_BUTTON = '[data-testid="forgot-password-confirm-button"]';
  private readonly CANCEL_BUTTON = '[data-testid="forgot-password-cancel-button"]';

  get title(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TITLE);
  }

  get description(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.DESCRIPTION);
  }

  get confirmButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONFIRM_BUTTON);
  }

  get cancelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CANCEL_BUTTON);
  }
}

export default new ForgotPasswordModal();
