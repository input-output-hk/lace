/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export default class CommonOnboardingElements {
  private STEP_HEADER = '[data-testid="wallet-setup-step-header"]';
  private STEP_HEADER_TITLE = '[data-testid="wallet-setup-step-title"]';
  private STEP_HEADER_SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private BACK_BUTTON = '[data-testid="wallet-setup-step-btn-back"]';
  private NEXT_BUTTON = '[data-testid="wallet-setup-step-btn-next"]';
  private HELP_AND_SUPPORT_BUTTON = '[data-testid="help-and-support-button"]';
  private COOKIE_POLICY_LINK = '[data-testid="cookie-policy-link"]';
  private PRIVACY_POLICY_LINK = '[data-testid="privacy-policy-link"]';
  private TERMS_OF_SERVICE_LINK = '[data-testid="terms-of-service-link"]';

  get stepHeader(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STEP_HEADER);
  }

  get stepTitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STEP_HEADER_TITLE);
  }

  get stepSubtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.STEP_HEADER_SUBTITLE);
  }

  get backButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.BACK_BUTTON);
  }

  get nextButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NEXT_BUTTON);
  }

  get helpAndSupportButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.HELP_AND_SUPPORT_BUTTON);
  }

  get cookiePolicyLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COOKIE_POLICY_LINK);
  }

  get privacyPolicyLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PRIVACY_POLICY_LINK);
  }

  get termsOfServiceLink(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.TERMS_OF_SERVICE_LINK);
  }
}
