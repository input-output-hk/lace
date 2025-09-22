import { Then, When } from '@wdio/cucumber-framework';
import OnboardingMainPageAssert from '../assert/onboarding/onboardingMainPageAssert';
import ConfigureMidnightPageAssert from '../assert/onboarding/ConfigureMidnightPageAssert';
import PasswordAuthPrompt from '../elements/midnight/PasswordAuthPrompt';
import topNavigationAssert from '../assert/topNavigationAssert';
import TokensPageAssert from '../assert/tokensPageAssert';

Then(/^I see "Let's explore Web3 together" page for Midnight wallet onboarding$/, async () => {
  await OnboardingMainPageAssert.assertSeeMainPage('Midnight');
});

Then(/^"Configure Midnight" page is displayed$/, async () => {
  await ConfigureMidnightPageAssert.assertSeeConfigureMidnightPage();
});

When(/^I enter wallet password and accept password prompt$/, async () => {
  await PasswordAuthPrompt.enterPasswordAndConfirm('N_8J@bne87A');
});

Then(/^Midnight wallet is synced$/, async () => {
  await topNavigationAssert.assertMidnightWalletIsInSyncedStatus();
});

Then(/^I see main elements of "Tokens" page for Midnight wallet$/, async () => {
  await TokensPageAssert.assertSeeMidnightTokensPage();
});
