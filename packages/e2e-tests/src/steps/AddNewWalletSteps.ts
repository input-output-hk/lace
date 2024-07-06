import { Given, Then } from '@cucumber/cucumber';
import AddNewWalletAssert from '../assert/AddNewWalletAssert';
import MenuHeader from '../elements/menuHeader';
import OnboardingMainPage from '../elements/onboarding/mainPage';

Then(/^I see onboarding main screen within modal over the active Lace page in expanded view$/, async () => {
  await AddNewWalletAssert.assertMainModalIsDisplayedInExtendedMode();
});

Given(
  /^I opened "(Connect|Create|Restore)" flow via "Add new wallet" feature$/,
  async (flow: 'Connect' | 'Create' | 'Restore') => {
    await MenuHeader.openUserMenu();
    await MenuHeader.clickOnAddNewWalletOption();
    await OnboardingMainPage.clickOnOnboardingTypeButton(flow);
  }
);

Then(/^"Wallet setup" page is displayed in modal$/, async () => {
  await AddNewWalletAssert.assertSeeWalletSetupPageInModal();
});
