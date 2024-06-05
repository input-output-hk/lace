import { Page } from '@playwright/test';

import { TestWallet } from '../utils/wallets';
import { BasePage } from './basePage';
import { AllDonePage } from './onboarding/allDonePage';
import { AnalyticsPage } from './onboarding/analyticsPage';
import { PassphrasePage } from './onboarding/passphrasePage';
import { PasswordPage } from './onboarding/passwordPage';
import { PhraseLengthPage } from './onboarding/phraseLengthPage';
import { SetupPage } from './onboarding/setupPage';
import { TermsAndConditionsPage } from './onboarding/termsAndConditionsPage';
import { WalletNamePage } from './onboarding/walletNamePage';

export class OnboardingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async restoreWallet(testWallet: TestWallet): Promise<void> {
    await new SetupPage(this.page).clickRestoreButton();
    await new TermsAndConditionsPage(this.page).clickAcceptTermsAndConditions();
    await new AnalyticsPage(this.page).clickAgreeButton();
    await new WalletNamePage(this.page).enterWalletName(testWallet.name);
    await new PasswordPage(this.page).enterPassword(testWallet.password);
    await new PhraseLengthPage(this.page).click24PhraseRadioButton();
    await new PassphrasePage(this.page).enter24Passphrase(testWallet.passphrase);
    await new AllDonePage(this.page).clickGoToWalletButton();
  }
}
