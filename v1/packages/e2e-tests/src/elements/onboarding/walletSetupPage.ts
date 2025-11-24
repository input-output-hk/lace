/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';
import CommonOnboardingElements from './commonOnboardingElements';
import { setInputFieldValue } from '../../utils/inputFieldUtils';
import recoveryPhrasePage from './recoveryPhrasePage';
import onboardingWalletSetupPageAssert from '../../assert/onboarding/onboardingWalletSetupPageAssert';
import { ChainablePromiseArray } from 'webdriverio/build/types';

class WalletSetupPage extends CommonOnboardingElements {
  private SUBTITLE = '[data-testid="wallet-setup-step-subtitle"]';
  private WALLET_NAME_INPUT = '[data-testid="wallet-name-input"]';
  private WALLET_NAME_ERROR = '[data-testid="wallet-name-input-error"]';
  private PASSWORD_INPUT = 'input[data-testid="wallet-password-verification-input"]';
  private PASSWORD_CONFIRM_INPUT = 'input[data-testid="wallet-password-confirmation-input"]';
  private PASSWORD_CONFIRM_ERROR = '[data-testid="wallet-password-confirmation-input-error"]';
  private COMPLEXITY_BARS_ACTIVE = '[data-testid="bar-level-active"]';
  private PASSWORD_FEEDBACK = '[data-testid="password-feedback"]';
  private ENTER_WALLET_BUTTON = '[data-testid="wallet-setup-step-btn-next"]';
  private PASSWORD_SHOW_BUTTON = '//button[@data-testid="wallet-password-verification-input-show-icon"]';
  private PASSWORD_HIDE_BUTTON = '//button[@data-testid="wallet-password-verification-input-hide-icon"]';
  private PASSWORD_CONFIRMATION_SHOW_BUTTON = '//button[@data-testid="wallet-password-confirmation-input-show-icon"]';
  private PASSWORD_CONFIRMATION_HIDE_BUTTON = '//button[@data-testid="wallet-password-confirmation-input-hide-icon"]';

  get subtitle(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SUBTITLE);
  }

  get walletNameInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME_INPUT);
  }

  get walletNameError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME_ERROR);
  }

  get walletPasswordInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_INPUT);
  }

  get walletPasswordConfirmInput(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_CONFIRM_INPUT);
  }

  get activeComplexityBars(): ChainablePromiseArray<WebdriverIO.ElementArray> {
    return $$(this.COMPLEXITY_BARS_ACTIVE);
  }

  get walletPasswordConfirmError(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_CONFIRM_ERROR);
  }

  get passwordFeedback(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_FEEDBACK);
  }

  get passwordShowIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_SHOW_BUTTON);
  }

  get passwordHideIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_HIDE_BUTTON);
  }

  get passwordConfirmationShowIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_CONFIRMATION_SHOW_BUTTON);
  }

  get passwordConfirmationHideIcon(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.PASSWORD_CONFIRMATION_HIDE_BUTTON);
  }

  get enterWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ENTER_WALLET_BUTTON);
  }

  async setWalletNameInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletNameInput, value);
  }

  async setWalletPasswordInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletPasswordInput, value);
  }

  async setWalletPasswordConfirmInput(value: string): Promise<void> {
    await setInputFieldValue(await this.walletPasswordConfirmInput, value);
  }

  async clickEnterWalletButton(): Promise<void> {
    await onboardingWalletSetupPageAssert.assertEnterWalletButtonIsEnabled();
    await this.nextButton.click();
  }

  async getNumberOfActiveComplexityBars(): Promise<number> {
    return this.activeComplexityBars.length;
  }

  async switchPasswordVisibility(action: 'Show' | 'Hide', field: 'Password' | 'Confirm password'): Promise<void> {
    if (field === 'Password') {
      if (action === 'Show') {
        await this.passwordShowIcon.click();
      }
      if (action === 'Hide') {
        await this.passwordHideIcon.click();
      }
    }
    if (field === 'Confirm password') {
      if (action === 'Show') {
        await this.passwordConfirmationShowIcon.click();
      }
      if (action === 'Hide') {
        await this.passwordConfirmationHideIcon.click();
      }
    }
  }

  async goToWalletSetupPage(
    flowType: 'Create' | 'Restore',
    mnemonicWords: string[] = [],
    fillValues = false
  ): Promise<void> {
    await recoveryPhrasePage.goToMnemonicVerificationPage(flowType, mnemonicWords, true);
    await recoveryPhrasePage.nextButton.waitForClickable();
    await recoveryPhrasePage.nextButton.click();
    if (fillValues) {
      await this.setWalletNameInput('TestAutomationWallet');
      await this.setWalletPasswordInput('N_8J@bne87A');
      await this.setWalletPasswordConfirmInput('N_8J@bne87A');
    }
  }
}

export default new WalletSetupPage();
