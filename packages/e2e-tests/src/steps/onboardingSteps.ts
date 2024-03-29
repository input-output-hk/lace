import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import { switchToLastWindow } from '../utils/window';
import { t } from '../utils/translationService';
import CommonOnboardingElements from '../elements/onboarding/commonOnboardingElements';
import Modal from '../elements/modal';
import ModalAssert from '../assert/modalAssert';
import OnboardingAnalyticsPage from '../elements/onboarding/analyticsPage';
import OnboardingCommonAssert from '../assert/onboarding/onboardingCommonAssert';
import OnboardingConnectHWPageAssert from '../assert/onboarding/onboardingConnectHWPageAssert';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import OnboardingMainPageAssert from '../assert/onboarding/onboardingMainPageAssert';
import OnboardingMnemonicPageAssert from '../assert/onboarding/onboardingMnemonicPageAssert';
import OnboardingPageObject from '../pageobject/onboardingPageObject';
import OnboardingWalletCreationPageAssert from '../assert/onboarding/onboardingWalletCreationPageAssert';
import OnboardingWalletSetupPage from '../elements/onboarding/walletSetupPage';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import TokensPageAssert from '../assert/tokensPageAssert';
import TopNavigationAssert from '../assert/topNavigationAssert';
import testContext from '../utils/testContext';
import CommonAssert from '../assert/commonAssert';
import OnboardingConnectHardwareWalletPage from '../elements/onboarding/connectHardwareWalletPage';
import SelectAccountPage from '../elements/onboarding/selectAccountPage';
import { browser } from '@wdio/globals';
import type { RecoveryPhrase } from '../types/onboarding';
import { generateRandomString } from '../utils/textUtils';
import OnboardingRevampPageObject from '../pageobject/onboardingRevampPageObject';
import onboardingRecoveryPhrasePageAssert from '../assert/onboarding/onboardingRecoveryPhrasePageAssert';
import RecoveryPhrasePage from '../elements/onboarding/recoveryPhrasePage';
import onboardingWatchVideoModalAssert from '../assert/onboarding/onboardingWatchVideoModalAssert';
import watchVideoModal from '../elements/onboarding/watchVideoModal';
import analyticsBanner from '../elements/analyticsBanner';
import { getWalletsFromRepository } from '../fixture/walletRepositoryInitializer';
import OnboardingWalletSetupPageAssert from '../assert/onboarding/onboardingWalletSetupPageAssert';
import OnboardingAnalyticsBannerAssert from '../assert/onboarding/onboardingAnalyticsBannerAssert';

const mnemonicWords: string[] = getTestWallet(TestWalletName.TestAutomationWallet).mnemonic ?? [];
const invalidMnemonicWords: string[] = getTestWallet(TestWalletName.InvalidMnemonic).mnemonic ?? [];
const twelveMnemonicWords: string[] = getTestWallet(TestWalletName.TwelveWordsMnemonic).mnemonic ?? [];
const fifteenMnemonicWords: string[] = getTestWallet(TestWalletName.FifteenWordsMnemonic).mnemonic ?? [];

const mnemonicWordsForReference: string[] = [];
const validPassword = 'N_8J@bne87A';

When(
  /^I click "(Create|Connect|Restore)" button on wallet setup page$/,
  async (button: 'Create' | 'Connect' | 'Restore') => {
    switch (button) {
      case 'Create':
        await OnboardingMainPage.createWalletButton.click();
        break;
      case 'Connect':
        await OnboardingMainPage.hardwareWalletButton.click();
        break;
      case 'Restore':
        await OnboardingMainPage.restoreWalletButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

When(/^I click "(Back|Next)" button during wallet setup$/, async (button: 'Back' | 'Next') => {
  const commonOnboardingElements = new CommonOnboardingElements();
  switch (button) {
    case 'Back':
      await commonOnboardingElements.clickOnBackButton();
      break;
    case 'Next':
      await commonOnboardingElements.clickOnNextButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

When(/^I select ([^"]*) account on Select Account page$/, async (accountNumber: number) => {
  await SelectAccountPage.accountRadioButtons[accountNumber - 1].click();
});

When(/^I click "(Back|Skip|Agree)" button on Analytics page$/, async (button: 'Back' | 'Skip' | 'Agree') => {
  switch (button) {
    case 'Back':
      await OnboardingAnalyticsPage.backButton.click();
      break;
    case 'Skip':
      await OnboardingAnalyticsPage.skipButton.click();
      break;
    case 'Agree':
      await OnboardingAnalyticsPage.nextButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

When(/^I click "Go to my wallet" button on "All done" page$/, async () => {
  await RecoveryPhrasePage.nextButton.waitForClickable();
  await RecoveryPhrasePage.nextButton.click();
});

When(
  /^I click "(Cancel|OK)" button on "(Limited support for DApp|Restoring a multi-address wallet\?|Are you sure you want to start again\?)" modal$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (button: 'Cancel' | 'OK', _modalType: string) => {
    await browser.pause(500);
    switch (button) {
      case 'Cancel':
        await Modal.cancelButton.click();
        break;
      case 'OK':
        await Modal.confirmButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Given(/^I click "Restore" button and confirm$/, async () => {
  await OnboardingMainPage.restoreWalletButton.click();
});

When(/^I enter wallet name: "([^"]*)"$/, async (walletName: string) => {
  await OnboardingPageObject.fillWalletNameInput(walletName === 'empty' ? '' : walletName);
});

When(/^I enter wallet name with size of: ([^"]*) characters$/, async (numberOfCharacters: number) => {
  const walletName = await generateRandomString(numberOfCharacters);
  await OnboardingWalletSetupPage.setWalletNameInput(walletName);
});

When(
  /^I enter password: "([^"]*)" and password confirmation: "([^"]*)"$/,
  async (password: string, passwordConf: string) => {
    await OnboardingPageObject.fillPasswordPage(
      password === 'empty' ? '' : password,
      passwordConf === 'empty' ? '' : passwordConf
    );
  }
);

Then(/^Name error "([^"]*)" is displayed/, async (nameError: string) => {
  await OnboardingWalletSetupPageAssert.assertSeeWalletNameError(await t(nameError));
});

Then(
  // eslint-disable-next-line max-len
  /^Password recommendation: "([^"]*)", complexity bar level: "(\d{0,4})" and password confirmation error: "([^"]*)" are displayed$/,
  async (passwordErr: string, complexityBar: 0 | 1 | 2 | 3 | 4, passwordConfErr: string) => {
    await OnboardingWalletSetupPageAssert.assertSeePasswordConfirmationError(
      await t(passwordConfErr),
      passwordConfErr !== 'empty'
    );
    await OnboardingWalletSetupPageAssert.assertSeePasswordRecommendation(
      await t(passwordErr),
      passwordErr !== 'empty'
    );
    await OnboardingWalletSetupPageAssert.assertSeeComplexityBar(complexityBar);
  }
);

Then(/^"Get started" page is displayed$/, async () => {
  await OnboardingMainPageAssert.assertSeeMainPage();
});

Then(/^I (accept|reject) analytics banner on "Get started" page$/, async (action: 'accept' | 'reject') => {
  action === 'accept' ? await analyticsBanner.agreeButton.click() : await analyticsBanner.rejectButton.click();
});

Then(/^I select (12|15|24) word passphrase length$/, async (length: RecoveryPhrase) => {
  await RecoveryPhrasePage.selectMnemonicLength(length);
});

Then(/^"Connect Hardware Wallet" page is displayed$/, async () => {
  await OnboardingConnectHWPageAssert.assertSeeConnectHardwareWalletPage();
});

Then(/^I click Trezor wallet icon$/, async () => {
  await OnboardingConnectHardwareWalletPage.trezorButton.click();
});

Then(/^"Creating wallet" page is displayed$/, async () => {
  await OnboardingWalletCreationPageAssert.assertSeeCreatingWalletPage();
});

Then(/^Creating wallet page finishes in < (\d*)s$/, async (duration: number) => {
  await OnboardingWalletCreationPageAssert.assertCreatingWalletDuration(duration);
});

Then(/^"Restoring a multi-address wallet\?" modal is displayed$/, async () => {
  await ModalAssert.assertSeeRestoringMultiAddressWalletModal();
});

Then(/^I accept "T&C" checkbox$/, async () => {
  await OnboardingPageObject.acceptTCCheckbox();
});

Given(/^I am on "Lace terms of use" page and accept terms$/, async () => {
  await OnboardingPageObject.openAndAcceptTermsOfUsePage();
});

Given(/^I am on "Connect Hardware Wallet" page$/, async () => {
  await OnboardingPageObject.openConnectHardwareWalletPage();
});

Given(/^I am on "Mnemonic writedown" page with words (8|16|24) of 24$/, async (expectedWords: number) => {
  mnemonicWords.length = 0;
  await OnboardingPageObject.goToMnemonicWriteDownPage();
  mnemonicWords.push(...(await OnboardingPageObject.openMnemonicWriteDownPage(expectedWords)));
  await OnboardingMnemonicPageAssert.assertSeeMnemonicWriteDownPage(expectedWords);
});
Given(/^I pass "Mnemonic writedown" page with words (8|16|24) of 24$/, async (expectedWords: number) => {
  if (String(expectedWords) === '8') {
    mnemonicWords.length = 0;
  }
  mnemonicWords.push(...(await OnboardingPageObject.passMnemonicWriteDownPage()));
});
Given(/^I pass "Mnemonic verification" page with words (8|16|24) of 24$/, async (expectedWords: number) => {
  await OnboardingPageObject.passMnemonicVerificationPage(mnemonicWords, expectedWords);
});

Then(/^Words 1 - 8 (are|are not) the same$/, async (expectedMatch: string) => {
  const shouldBeEqual: boolean = expectedMatch === 'are';
  await OnboardingMnemonicPageAssert.assertMnemonicWordsAreTheSame(
    mnemonicWords,
    mnemonicWordsForReference,
    shouldBeEqual
  );
});

Given(/^I am on "Mnemonic verification" page with words (8|16|24) of 24$/, async (expectedWords: number) => {
  mnemonicWords.length = 0;
  await OnboardingPageObject.goToMnemonicWriteDownPage();
  mnemonicWords.push(...(await OnboardingPageObject.openMnemonicVerificationPage(expectedWords)));
  await OnboardingMnemonicPageAssert.assertSeeMnemonicVerificationWordsPage(expectedWords);
});

Given(
  /^I am on "Mnemonic verification" last page from "(Create wallet|Restore wallet|Forgot password)" and filled all words$/,
  async (flow) => {
    if (flow === 'Create wallet') {
      await OnboardingPageObject.goToMnemonicWriteDownPage();
      await OnboardingPageObject.openMnemonicVerificationLastPageFromWalletCreate();
    } else {
      await OnboardingPageObject.openMnemonicVerificationLastPage(mnemonicWords);
    }
  }
);

Given(/^I am on "All done!" page from "Restore wallet" using "([^"]*)" wallet$/, async (walletName: string) => {
  await OnboardingPageObject.openAllDonePageFromWalletRestore(getTestWallet(walletName).mnemonic ?? []);
});

Then(/^I clear saved words$/, async () => {
  mnemonicWordsForReference.length = 0;
});

Then(/^I fill saved words (8|16|24) of 24$/, async (pageNumber: string) => {
  switch (pageNumber) {
    case '8':
      await OnboardingPageObject.fillMnemonicFields(mnemonicWordsForReference, 0);
      break;
    case '16':
      await OnboardingPageObject.fillMnemonicFields(mnemonicWordsForReference, 8);
      break;
    case '24':
      await OnboardingPageObject.fillMnemonicFields(mnemonicWordsForReference, 16);
      break;
  }
});

When(/^I fill mnemonic input with "([^"]*)"$/, async (value: string) => {
  await OnboardingRevampPageObject.enterMnemonicWord(value, 0, false);
});

When(/^I click on mnemonic input$/, async () => {
  await OnboardingPageObject.clickOnInput();
});

When(/^I add characters "([^"]*)" in word ([0-7])$/, async (characters: string, inputNumber: number) => {
  await OnboardingPageObject.addCharToMnemonicField(characters, inputNumber);
});

Then(/^I see LW homepage$/, async () => {
  // TODO update in the future
  await TopNavigationAssert.assertLogoPresent();
  await TopNavigationAssert.assertSeeReceiveButton();
  await TopNavigationAssert.assertSeeSendButton();
  await TokensPageAssert.assertSeeTitle();
});

Then(/^I see Lace extension main page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await TopNavigationAssert.assertLogoPresent();
  if (mode === 'extended') {
    await TopNavigationAssert.assertSeeReceiveButton();
    await TopNavigationAssert.assertSeeSendButton();
  } else {
    await TokensPageAssert.assertSeeReceiveAndSendButtonsInPopupMode(true);
    await TopNavigationAssert.assertSeeExpandButton(false);
  }
  await TokensPageAssert.assertSeeTitle();
});

Then(/^I change one random field$/, async () => {
  await OnboardingPageObject.changeRandomMnemonicField();
});

Then(/^I clear one random field$/, async () => {
  await OnboardingPageObject.clearRandomMnemonicField();
});

Then(/^I navigate to "Mnemonic info" page$/, async () => {
  await OnboardingMainPage.createWalletButton.click();
  await OnboardingPageObject.openNameYourWalletPage();
  await OnboardingPageObject.fillWalletNameInput('ValidName');
  await OnboardingWalletSetupPage.nextButton.click();
  await OnboardingPageObject.fillPasswordPage(validPassword, validPassword);
  await OnboardingWalletSetupPage.nextButton.click();
});

Then(/^I see following autocomplete options:$/, async (options: DataTable) => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicAutocompleteOptions(dataTableAsStringArray(options));
});

Then(/^I click header to loose focus$/, async () => {
  await OnboardingPageObject.clickHeaderToLooseFocus();
});

Then(/^I do not see autocomplete options list$/, async () => {
  await OnboardingMnemonicPageAssert.assertNotSeeMnemonicAutocompleteOptions();
});

Given(/^I create new wallet and save wallet information$/, async () => {
  await OnboardingMainPage.createWalletButton.click();
  await OnboardingRevampPageObject.goToWalletSetupPage('Create', mnemonicWords);
  await OnboardingWalletSetupPageAssert.assertSeeWalletSetupPage();
  await OnboardingRevampPageObject.clickEnterWalletButton();
  await TopNavigationAssert.assertLogoPresent();
  await settingsExtendedPageObject.switchNetworkAndCloseDrawer('Preprod', 'extended');
  const newCreatedWallet = JSON.stringify(await getWalletsFromRepository());
  testContext.save('newCreatedWallet', newCreatedWallet);
});

Then(/^the mnemonic input contains the word "([^"]*)"$/, async (expectedWord: string) => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicInputWithText(0, expectedWord);
});

Then(/^the word in mnemonic input has only ([^"]*) characters$/, async (expectedLength: string) => {
  await OnboardingMnemonicPageAssert.assertMnemonicInputLength(0, Number(expectedLength));
});

When(/^I click on Privacy Policy link$/, async () => {
  await OnboardingAnalyticsPage.privacyPolicyLinkWithinDescription.click();
});

When(
  /^I click on "(Cookie policy|Privacy policy|Terms of service)" legal link"$/,
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service') => {
    await OnboardingPageObject.clickOnLegalLink(link);
  }
);

When(
  /^I click on "(Cookie policy|Privacy policy|Terms of service)" legal link(?: on "(Main page)")?$/,
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service', page?: 'Main page') => {
    await OnboardingRevampPageObject.clickOnLegalLink(link, page === 'Main page');
  }
);

Then(/^I (do not see|see) incorrect passphrase error displayed$/, async (shouldBeDisplayed: 'do not see' | 'see') => {
  await onboardingRecoveryPhrasePageAssert.assertSeeMnemonicError(shouldBeDisplayed === 'see');
});

Then(
  /^"(Cookie policy|Privacy policy|Terms of service)" is displayed in new tab$/,
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service') => {
    await switchToLastWindow();
    await new OnboardingCommonAssert().assertLegalContentIsDisplayed(link);
  }
);

Then(/^wallet name error "([^"]*)" (is|is not) displayed$/, async (errorText: string, isDisplayed: 'is' | 'is not') => {
  const expectedMessage = await t(errorText);
  await OnboardingWalletSetupPageAssert.assertSeeWalletNameError(expectedMessage, isDisplayed === 'is');
});

When(/^I click "Help and support" button during wallet setup$/, async () => {
  await new CommonOnboardingElements().helpAndSupportButton.click();
});

Given(/^I restore a wallet$/, async () => {
  await OnboardingPageObject.restoreWallet();
});

Given(/^I see current onboarding page in (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await CommonAssert.assertSeeThemeMode(mode);
});

Given(
  /^I enter wallet name: "([^"]*)", password: "([^"]*)" and password confirmation: "([^"]*)"$/,
  async (walletName: string, password: string, passwordConfirmation: string) => {
    await OnboardingWalletSetupPage.setWalletNameInput(walletName);
    await OnboardingWalletSetupPage.setWalletPasswordInput(password);
    await OnboardingWalletSetupPage.setWalletPasswordConfirmInput(passwordConfirmation);
  }
);

When(/^I restore previously changed mnemonic word$/, async () => {
  await OnboardingPageObject.restorePreviousMnemonicWord();
});

Given(
  /^I go to "(Mnemonic verification|Wallet setup)" page(?: with wallet ([^"]*))? from "(Create|Restore)" wallet flow(?: and "(fill|not fill)" values)?$/,
  async (
    endPage: 'Mnemonic verification' | 'Wallet setup',
    walletName: string,
    flowType: 'Create' | 'Restore',
    fillValues: 'fill' | 'not fill'
  ) => {
    if (!fillValues) fillValues = 'fill';
    let mnemonicsToUse = mnemonicWords;
    if (walletName) mnemonicsToUse = getTestWallet(walletName).mnemonic ?? [];
    switch (endPage) {
      case 'Mnemonic verification':
        await OnboardingRevampPageObject.goToMnemonicVerificationPage(flowType, mnemonicsToUse, fillValues === 'fill');
        break;
      case 'Wallet setup':
        await OnboardingRevampPageObject.goToWalletSetupPage(flowType, mnemonicsToUse, fillValues === 'fill');
        break;
      default:
        throw new Error(`Unsupported page name: ${endPage}`);
    }
  }
);

Given(/^I click "Enter wallet" button$/, async () => {
  await OnboardingRevampPageObject.clickEnterWalletButton();
});

Given(
  /^I enter (12|15|24) (correct|incorrect) mnemonic words on "Mnemonic verification" page$/,
  async (mnemonicWordsLength: RecoveryPhrase, isCorrect: 'correct' | 'incorrect') => {
    switch (mnemonicWordsLength) {
      case '12':
        await OnboardingRevampPageObject.enterMnemonicWords(
          isCorrect === 'correct' ? twelveMnemonicWords : invalidMnemonicWords.slice(0, 12)
        );
        break;
      case '15':
        await OnboardingRevampPageObject.enterMnemonicWords(
          isCorrect === 'correct' ? fifteenMnemonicWords : invalidMnemonicWords.slice(0, 15)
        );
        break;
      case '24':
        await OnboardingRevampPageObject.enterMnemonicWords(
          isCorrect === 'correct' ? mnemonicWords : invalidMnemonicWords
        );
        break;
    }
  }
);

When(/^I click on "Watch video" link on "Mnemonic writedown" page$/, async () => {
  await RecoveryPhrasePage.watchVideoLink.click();
});

When(/^I click "Read More" link in modal$/, async () => {
  await watchVideoModal.readMoreLink.click();
});

When(/^I save mnemonic words$/, async () => {
  mnemonicWordsForReference.push(...(await RecoveryPhrasePage.getMnemonicWordTexts()));
});

When(/^I enter saved mnemonic words$/, async () => {
  await OnboardingRevampPageObject.enterMnemonicWords(mnemonicWordsForReference);
});

Then(/^"Mnemonic writedown" page is displayed with (12|15|24) words$/, async (mnemonicWordsLength: RecoveryPhrase) => {
  await onboardingRecoveryPhrasePageAssert.assertSeeMnemonicWritedownPage(mnemonicWordsLength);
});

Then(/^"Enter wallet" button is enabled$/, async () => {
  await OnboardingWalletSetupPageAssert.assertEnterWalletButtonIsEnabled();
});

Then(/^"Wallet setup" page is displayed$/, async () => {
  await OnboardingWalletSetupPageAssert.assertSeeWalletSetupPage();
});

Then(/^I see "Watch video" modal$/, async () => {
  await onboardingWatchVideoModalAssert.assertSeeModal();
});

Then(
  /^"Mnemonic verification" page is displayed from "(Create wallet|Restore wallet|Forgot password)" flow with (12|15|24) words$/,
  async (flow, mnemonicWordsLength: RecoveryPhrase) => {
    await (flow === 'Create wallet'
      ? onboardingRecoveryPhrasePageAssert.assertSeeMnemonicVerificationPage('Create', '24')
      : onboardingRecoveryPhrasePageAssert.assertSeeMnemonicVerificationPage('Restore', mnemonicWordsLength));
  }
);

Then(/^"Next" button is (enabled|disabled) during onboarding process$/, async (state: 'enabled' | 'disabled') => {
  await new OnboardingCommonAssert().assertNextButtonEnabled(state === 'enabled');
});

Then(/^I see Analytics banner displayed correctly$/, async () => {
  await OnboardingAnalyticsBannerAssert.assertBannerIsDisplayedCorrectly();
});

Then(/^I (see|do not see) Analytics banner$/, async (shouldSee: 'see' | 'do not see') => {
  await OnboardingAnalyticsBannerAssert.assertBannerIsVisible(shouldSee === 'see');
});
