import { Given, Then, When } from '@cucumber/cucumber';
import AddNewWalletAssert from '../assert/AddNewWalletAssert';
import MenuHeader from '../elements/menuHeader';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import CancelAddingNewWalletDialog from '../elements/addNewWallet/CancelAddingNewWalletDialog';
import SecureYourPaperWalletPageAssert from '../assert/onboarding/SecureYourPaperWalletPageAssert';
import ChooseRecoveryMethodPageAssert from '../assert/onboarding/ChooseRecoveryMethodPageAssert';
import SaveYourPaperWalletPageAssert from '../assert/onboarding/SaveYourPaperWalletPageAssert';
import CommonOnboardingElements from '../elements/onboarding/commonOnboardingElements';

Then(/^I see the main onboarding page for the "Add new wallet" flow in extended view$/, async () => {
  await AddNewWalletAssert.assertMainPageForAddNewWalletFlowIsDisplayedInExtendedMode();
});

Then(/^"Add new wallet" page is not displayed$/, async () => {
  await AddNewWalletAssert.assertMainPageForAddNewWalletIsNotDisplayed();
});

Given(
  /^I opened "(Connect|Create|Restore)" flow via "Add new wallet" feature$/,
  async (flow: 'Connect' | 'Create' | 'Restore') => {
    await MenuHeader.openUserMenu();
    await MenuHeader.clickOnAddNewWalletOption();
    await OnboardingMainPage.clickOnOnboardingTypeButton(flow);
  }
);

Then(
  /^"Let's set up your new wallet" page is displayed for "(Create|Create paper wallet|Restore)" flow while adding another wallet$/,
  async (flow: 'Create' | 'Create paper wallet' | 'Restore') => {
    await AddNewWalletAssert.assertSeeWalletSetupPage(flow);
  }
);

Then(/^"Connect your device" page is displayed in "Add new wallet" flow$/, async () => {
  await AddNewWalletAssert.asserSeeConnectYourDevicePage();
});

When(/^I click "X" button on "Add new wallet" flow$/, async () => {
  const closeButton = await new CommonOnboardingElements().addNewWalletCloseButton;
  await closeButton.waitForClickable();
  await closeButton.click();
});

Then(
  /^"Are you sure you want to cancel adding a new wallet\?" dialog (is|is not) displayed$/,
  async (state: 'is' | 'is not') => {
    await AddNewWalletAssert.assertSeeStartOverDialog(state === 'is');
  }
);

When(
  /^I click "(Go back|Proceed)" button on "Are you sure you want to cancel adding a new wallet\?" dialog$/,
  async (button: 'Go back' | 'Proceed') => {
    switch (button) {
      case 'Go back':
        await CancelAddingNewWalletDialog.clickGoBackButton();
        break;
      case 'Proceed':
        await CancelAddingNewWalletDialog.clickProceedButton();
        break;
      default:
        throw new Error(`Unsupported button: ${button}`);
    }
  }
);

Then(
  /^"Choose recovery method" page is displayed in modal for "(Create|Restore)" flow$/,
  async (flow: 'Create' | 'Restore') => {
    await ChooseRecoveryMethodPageAssert.assertSeeChooseRecoveryMethodPage(flow, true);
  }
);

Then(/^"Secure your paper wallet" page is displayed in modal$/, async () => {
  await SecureYourPaperWalletPageAssert.assertSeeSecureYourPaperWalletPage(true);
});

Then(
  /^"Save your paper wallet" page is displayed in modal with "([^"]*)" file name$/,
  async (expectedPaperWalletName: string) => {
    await SaveYourPaperWalletPageAssert.assertSeeSaveYourPaperWalletPage(expectedPaperWalletName, true);
  }
);
