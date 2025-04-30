import { Given, Then, When } from '@cucumber/cucumber';
import AddNewWalletAssert from '../assert/AddNewWalletAssert';
import MenuHeader from '../elements/menuHeader';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import AddNewWalletMainModal from '../elements/addNewWallet/MainModal';
import CancelAddingNewWalletDialog from '../elements/addNewWallet/CancelAddingNewWalletDialog';
import SecureYourPaperWalletPageAssert from '../assert/onboarding/SecureYourPaperWalletPageAssert';
import ChooseRecoveryMethodPageAssert from '../assert/onboarding/ChooseRecoveryMethodPageAssert';
import SaveYourPaperWalletPageAssert from '../assert/onboarding/SaveYourPaperWalletPageAssert';

Then(/^I see onboarding main screen within modal over the active Lace page in expanded view$/, async () => {
  await AddNewWalletAssert.assertMainModalIsDisplayedInExtendedMode();
});

Then(/^"Add new wallet" modal is not displayed$/, async () => {
  await AddNewWalletAssert.assertMainModalIsNotDisplayed();
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
  /^"Let's set up your new wallet" page is displayed in modal for "(Create|Create paper wallet|Restore)" flow$/,
  async (flow: 'Create' | 'Create paper wallet' | 'Restore') => {
    await AddNewWalletAssert.assertSeeWalletSetupPageInModal(flow);
  }
);

Then(/^"Connect your device" page is displayed in modal$/, async () => {
  await AddNewWalletAssert.asserSeeConnectYourDevicePageInModal();
});

When(/^I click "X" button on "Add new wallet" modal$/, async () => {
  await AddNewWalletMainModal.closeButton.waitForClickable();
  await AddNewWalletMainModal.closeButton.click();
});

Then(
  /^"Are you sure you want to cancel adding a new wallet\?" dialog (is|is not) displayed$/,
  async (state: 'is' | 'is not') => {
    await AddNewWalletAssert.assertSeeStartOverDialog(state === 'is');
  }
);

When(/^I click outside "Add new wallet" modal$/, async () => {
  await AddNewWalletMainModal.modalMask.moveTo({ xOffset: 0, yOffset: 0 });
  await browser.action('pointer').down().perform();
});

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
