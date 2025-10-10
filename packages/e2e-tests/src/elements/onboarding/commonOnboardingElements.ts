/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export default class CommonOnboardingElements {
  private readonly LACE_LOGO = '[data-testid="lace-logo"]';
  private readonly STEP_HEADER = '[data-testid="wallet-setup-step-header"]';
  private readonly STEP_HEADER_TITLE = '[data-testid="wallet-setup-step-title"]';
  private readonly STEP_HEADER_SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private readonly BACK_BUTTON = '[data-testid="wallet-setup-step-btn-back"]';
  private readonly NEXT_BUTTON = '[data-testid="wallet-setup-step-btn-next"]';
  private readonly HELP_AND_SUPPORT_BUTTON = '[data-testid="help-and-support-button"]';
  private readonly COOKIE_POLICY_LINK = '[data-testid="cookie-policy-link"]';
  private readonly PRIVACY_POLICY_LINK = '[data-testid="privacy-policy-link"]';
  private readonly TERMS_OF_SERVICE_LINK = '[data-testid="terms-of-service-link"]';
  private readonly ACTIVE_STEP_INDICATOR = '[data-testid="active-onboarding-step"]';
  private readonly COMPATIBILITY_LABEL = '[data-testid="compatibility-label"]';
  private readonly MIDNIGHT_SYMBOL = '[data-testid="midnight-symbol"]';
  private readonly MIDNIGHT_LABEL = '[data-testid="midnight-label"]';

  get laceLogo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LACE_LOGO);
  }

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

  get activeStepIndicator(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACTIVE_STEP_INDICATOR);
  }

  get compatibilityLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.COMPATIBILITY_LABEL);
  }

  get midnightSymbol(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MIDNIGHT_SYMBOL);
  }

  get midnightLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MIDNIGHT_LABEL);
  }

  async clickOnNextButton(): Promise<void> {
    await this.nextButton.waitForClickable({ timeout: 12_000 });
    await this.nextButton.click();
  }

  async clickOnBackButton(): Promise<void> {
    await this.backButton.waitForClickable();
    await this.backButton.click();
  }

  async clickOnLegalLinkOnFooter(linkText: string): Promise<void> {
    switch (linkText) {
      case 'Cookie policy':
        await this.cookiePolicyLink.click();
        break;
      case 'Privacy policy':
        await this.privacyPolicyLink.click();
        break;
      case 'Terms of service':
        await this.termsOfServiceLink.click();
        break;
      default:
        throw new Error(`Unsupported legal link text - ${linkText}`);
    }
  }
}
