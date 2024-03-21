import { Then, When } from '@cucumber/cucumber';
import WalletUnlockPage from '../elements/walletUnlockPage';
import ForgotPasswordModalAssert from '../assert/forgotPasswordModalAssert';
import ForgotPasswordModal from '../elements/ForgotPasswordModal';
import OnboardingPageObject from '../pageobject/onboardingPageObject';
import WalletSetupPage from '../elements/onboarding/walletSetupPage';
import LocalStorageAssert from '../assert/localStorageAssert';
import BackgroundStorageAssert from '../assert/backgroundStorageAssert';
import extendedView from '../page/extendedView';
import { browser } from '@wdio/globals';

const validPassword = 'N_8J@bne87A';

When(/^I click on "Forgot password\?" button on unlock screen$/, async () => {
  await WalletUnlockPage.forgotPassword.waitForClickable();
  await WalletUnlockPage.forgotPassword.click();
  await browser.pause(1000);
});

Then(/^I see "Forgot password\?" modal$/, async () => {
  await ForgotPasswordModalAssert.assertSeeForgotPasswordModal();
});

When(/^I click on "(Cancel|Proceed)" button on "Forgot password\?" modal$/, async (button: 'Cancel' | 'Proceed') => {
  if (button === 'Cancel') {
    await ForgotPasswordModal.cancelButton.waitForClickable();
    await ForgotPasswordModal.cancelButton.click();
  } else {
    await ForgotPasswordModal.confirmButton.waitForClickable();
    await ForgotPasswordModal.confirmButton.click();
  }
});

Then(/^I switch to tab with restore wallet process$/, async () => {
  let pageFound = false;
  let retries = 5;
  while (retries-- && !pageFound) {
    let result;
    try {
      result = await browser.switchWindow(/setup\/restore/);
      pageFound = typeof result === 'string';
    } catch {
      console.error('Page not found. Retrying in 1s ...');
      await browser.pause(1000);
    }
    retries--;
  }
});

Then(/^I am on (.*) page of restoration flow$/, async (expectedPage: string) => {
  switch (expectedPage) {
    case 'password':
      // nothing to do as user lands on Password Page by default
      break;
    case 'mnemonic verification':
      await OnboardingPageObject.fillPasswordPage(validPassword, validPassword);
      await WalletSetupPage.nextButton.click();
      break;
    default:
      throw new Error(`Unknown page: ${expectedPage}`);
  }
});

Then(/^all wallet related data is removed$/, async () => {
  await LocalStorageAssert.assertWalletIsDeleted();
  await BackgroundStorageAssert.assertKeyAgentsByChainNotInBackgroundStorage();
});

When(/^I leave "Forgot password" flow$/, async () => {
  await extendedView.visit();
});
