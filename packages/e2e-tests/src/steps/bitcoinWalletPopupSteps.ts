import { When, Then } from '@cucumber/cucumber';
import addNewWalletAssert from '../assert/AddNewWalletAssert';
import { switchToLastWindow } from '../utils/window';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import recoveryPhrasePage from '../elements/onboarding/recoveryPhrasePage';
import OnboardingWalletSetupPage from '../elements/onboarding/walletSetupPage';
import TopNavigationAssert from '../assert/topNavigationAssert';
import { switchNetworkAndCloseDrawer } from '../utils/networkUtils';
import { getWalletsFromRepository } from '../fixture/walletRepositoryInitializer';
import testContext from '../utils/testContext';
import ChooseRecoveryMethodPage from '../elements/onboarding/ChooseRecoveryMethodPage';
import SelectBlockchainPage from '../elements/onboarding/SelectBlockchainPage';
import MenuHeader from '../elements/menuHeader';
import CancelAddingNewWalletDialog from '../elements/addNewWallet/CancelAddingNewWalletDialog';
import CommonOnboardingElements from '../elements/onboarding/commonOnboardingElements';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import tokensPage from '../elements/tokensPage';
import extendedView from '../page/extendedView';
import ShowPublicKeyDrawer from '../elements/settings/ShowPublicKeyDrawer';

const walletName = 'BTCAutomationWallet';
const walletPassword = 'N_8J@bne87A';

When(/^I click "Add New wallet" from user menu$/, async () => {
  await MenuHeader.openUserMenu();
  await MenuHeader.clickOnAddNewWalletOption();
});

Then(/^A new tab is opened with Lace in expanded view$/, async () => {
  await switchToLastWindow();
  await addNewWalletAssert.assertMainPageForAddNewWalletFlowIsDisplayedInExtendedMode();
});

Then(/^I select "(New wallet|Restore wallet)" option$/, async (button: 'New wallet' | 'Restore wallet') => {
  switch (button) {
    case 'New wallet':
      await OnboardingMainPage.createWalletButton.waitForClickable();
      await OnboardingMainPage.createWalletButton.click();
      break;
    case 'Restore wallet':
      await OnboardingMainPage.restoreWalletButton.waitForClickable();
      await OnboardingMainPage.restoreWalletButton.click();
      break;
    default:
      throw new Error(`Unsupported button: ${button}`);
  }
});

Then(/^I enter the mnemonics and confirm the import$/, async () => {
  await SelectBlockchainPage.nextButton.click();
  await CancelAddingNewWalletDialog.clickProceedButton();
  await ChooseRecoveryMethodPage.nextButton.click();
  await recoveryPhrasePage.enterMnemonicWords(getTestWallet(TestWalletName.TestAutomationWallet).mnemonic ?? []);
  await recoveryPhrasePage.nextButton.click();
  await OnboardingWalletSetupPage.setWalletNameInput(walletName);
  await OnboardingWalletSetupPage.setWalletPasswordInput(walletPassword);
  await OnboardingWalletSetupPage.setWalletPasswordConfirmInput(walletPassword);
  await OnboardingWalletSetupPage.clickEnterWalletButton();
  await TopNavigationAssert.assertLogoPresent();
});

Then(/^I copy and enter the mnemonics and confirm$/, async () => {
  await SelectBlockchainPage.nextButton.click();
  await CancelAddingNewWalletDialog.clickProceedButton();
  await ChooseRecoveryMethodPage.nextButton.click();
  await OnboardingWalletSetupPage.clickEnterWalletButton();
  await TopNavigationAssert.assertLogoPresent();
  await OnboardingWalletSetupPage.backButton.waitForClickable();
  await OnboardingWalletSetupPage.backButton.doubleClick();
  await recoveryPhrasePage.clickOnCopyToClipboardButton();
  await new CommonOnboardingElements().clickOnNextButton();
  await recoveryPhrasePage.clickOnPasteFromClipboardButton();
  await recoveryPhrasePage.nextButton.waitForClickable();
  await recoveryPhrasePage.nextButton.click();
  await OnboardingWalletSetupPage.setWalletNameInput(walletName);
  await OnboardingWalletSetupPage.setWalletPasswordInput(walletPassword);
  await OnboardingWalletSetupPage.setWalletPasswordConfirmInput(walletPassword);
  await OnboardingWalletSetupPage.clickEnterWalletButton();
});

Then(/^the wallet should be successfully imported$/, async () => {
  await TopNavigationAssert.assertLogoPresent();
  await switchNetworkAndCloseDrawer('Preprod', 'extended');
});

Then(/^the correct Bitcoin address should be derived$/, async () => {
  const newCreatedWallet = JSON.stringify(await getWalletsFromRepository());
  testContext.save('newCreatedWallet', newCreatedWallet);
  await extendedView.visitActivityPage();
  await ShowPublicKeyDrawer.walletAddress.waitForDisplayed();
});

Then(/^the user should see new empty wallet$/, async () => {
  await MenuHeader.openUserMenu();
  const menuWalletEl = await MenuHeader.walletNameOnButton;
  await menuWalletEl.waitForDisplayed();
  const walletNameText = await menuWalletEl.getText();
  expect(walletNameText).toContain('BTCAuto');
});

Then(/^the user should see their Bitcoin balance and recent transactions$/, async () => {
  expect(TopNavigationAssert.assertWalletIsActive(0)).toBeTruthy();
  await extendedView.visitTokensPage();
  await tokensPage.totalBalanceValue.waitForDisplayed({ timeout: 10_000 });
});
