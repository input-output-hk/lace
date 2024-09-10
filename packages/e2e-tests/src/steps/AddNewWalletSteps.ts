import { Given, Then, When } from '@cucumber/cucumber';
import AddNewWalletAssert from '../assert/AddNewWalletAssert';
import MenuHeader from '../elements/menuHeader';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import AddNewWalletMainModal from '../elements/addNewWallet/MainModal';
import CancelAddingNewWalletDialog from '../elements/addNewWallet/CancelAddingNewWalletDialog';

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

Then(/^"Wallet setup" page is displayed in modal$/, async () => {
  await AddNewWalletAssert.assertSeeWalletSetupPageInModal();
});

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
  await AddNewWalletMainModal.areaOutsideModal.click({ x: 0, y: 0 }); // TODO: adjust when LW-10975 is resolved
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

Then(/^"Choose a recovery method" page is displayed in modal$/, async () => {
  await AddNewWalletAssert.assertSeeChooseRecoveryMethodPageInModal();
});
