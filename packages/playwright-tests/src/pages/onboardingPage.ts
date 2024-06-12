import { Page } from '@playwright/test';

import { TestWallet } from '../utils/wallets';
import { BasePage } from './basePage';
import { AllDonePage } from './onboarding/allDonePage';
import { PassphrasePage } from './onboarding/passphrasePage';
import { SetupPage } from './onboarding/setupPage';
import { WalletNameAndPasswordPage } from './onboarding/walletNameAndPasswordPage';

export class OnboardingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async restoreWallet(testWallet: TestWallet): Promise<void> {
    await new SetupPage(this.page).clickAnalyticsAgreeButton();
    await new SetupPage(this.page).clickRestoreButton();
    await new PassphrasePage(this.page).enter24Passphrase(testWallet.passphrase);
    await new PassphrasePage(this.page).clickNextButton();
    await new WalletNameAndPasswordPage(this.page).enterName(testWallet.name);
    await new WalletNameAndPasswordPage(this.page).enterPassword(testWallet.password);
    await new AllDonePage(this.page).clickGoToWalletButton();
    // await new LaceBasePage(this.page).waitForPageLoad();
  }
}
