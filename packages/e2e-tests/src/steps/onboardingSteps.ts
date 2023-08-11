import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import { defaultAppSettings, getTestWallet, TestWalletName, WalletConfig } from '../support/walletConfiguration';
import { getBackgroundStorageItem } from '../utils/browserStorage';
import { switchToLastWindow } from '../utils/window';
import { t } from '../utils/translationService';
import CommonOnboardingElements from '../elements/onboarding/commonOnboardingElements';
import localStorageManager from '../utils/localStorageManager';
import Modal from '../elements/modal';
import ModalAssert from '../assert/modalAssert';
import OnboardingAllDonePage from '../elements/onboarding/allDonePage';
import OnboardingAllDonePageAssert from '../assert/onboarding/onboardingAllDonePageAssert';
import OnboardingAnalyticsPage from '../elements/onboarding/analyticsPage';
import OnboardingCommonAssert from '../assert/onboarding/onboardingCommonAssert';
import OnboardingConnectHWPageAssert from '../assert/onboarding/onboardingConnectHWPageAssert';
import OnboardingDataCollectionPageAssert from '../assert/onboarding/onboardingDataCollectionPageAssert';
import OnboardingLegalPageAssert from '../assert/onboarding/onboardingLegalPageAssert';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import OnboardingMainPageAssert from '../assert/onboarding/onboardingMainPageAssert';
import OnboardingMnemonicInfoPage from '../elements/onboarding/mnemonicInfoPage';
import OnboardingMnemonicInfoPageAssert from '../assert/onboarding/onboardingMnemonicInfoPageAssert';
import OnboardingMnemonicPage from '../elements/onboarding/mnemonicPage';
import OnboardingMnemonicPageAssert from '../assert/onboarding/onboardingMnemonicPageAssert';
import OnboardingPageObject from '../pageobject/onboardingPageObject';
import OnboardingRecoveryPhraseLengthPageAssert from '../assert/onboarding/onboardingRecoveryPhraseLengthPageAssert';
import OnboardingWalletCreationPageAssert from '../assert/onboarding/onboardingWalletCreationPageAssert';
import OnboardingWalletNamePage from '../elements/onboarding/walletNamePage';
import OnboardingWalletNamePageAssert from '../assert/onboarding/onboardingWalletNamePageAssert';
import OnboardingWalletPasswordPage from '../elements/onboarding/walletPasswordPage';
import OnboardingWalletPasswordPageAssert from '../assert/onboarding/onboardingWalletPasswordPageAssert';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import TokensPageAssert from '../assert/tokensPageAssert';
import TopNavigationAssert from '../assert/topNavigationAssert';
import testContext from '../utils/testContext';
import webTester from '../actor/webTester';
import MainLoader from '../elements/MainLoader';
import CommonAssert from '../assert/commonAssert';

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
      await commonOnboardingElements.backButton.click();
      break;
    case 'Next':
      await commonOnboardingElements.nextButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
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
  await OnboardingAllDonePage.nextButton.waitForClickable();
  await OnboardingAllDonePage.nextButton.click();
});

When(
  /^I click "(Cancel|OK)" button on "(Limited support for DApp|Restoring a multi-address wallet\?|Are you sure you want to start again\?)" modal$/,
  // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
  async (button: 'Cancel' | 'OK', _modalType: string) => {
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
  await Modal.confirmButton.waitForClickable();
  await Modal.confirmButton.click();
});

When(/^I enter wallet name: "([^"]*)"$/, async (walletName: string) => {
  await OnboardingPageObject.fillWalletNameInput(walletName === 'empty' ? '' : walletName);
});

When(/^I enter wallet name with size of: ([^"]*) characters$/, async (numberOfCharacters: number) => {
  const walletName = await webTester.generateRandomString(numberOfCharacters);
  await OnboardingPageObject.fillWalletNameInput(walletName);
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
  await OnboardingWalletNamePageAssert.assertSeeWalletNameError(await t(nameError));
});

Then(
  // eslint-disable-next-line max-len
  /^Password recommendation: "([^"]*)", complexity bar level: "(\d{0,4})" and password confirmation error: "([^"]*)" are displayed$/,
  async (passwordErr: string, complexityBar: 0 | 1 | 2 | 3 | 4, passwordConfErr: string) => {
    await OnboardingWalletPasswordPageAssert.assertSeePasswordConfirmationError(
      await t(passwordConfErr),
      passwordConfErr !== 'empty'
    );
    await OnboardingWalletPasswordPageAssert.assertSeePasswordRecommendation(
      await t(passwordErr),
      passwordErr !== 'empty'
    );
    await OnboardingWalletPasswordPageAssert.assertSeeComplexityBar(complexityBar);
  }
);

Then(/^"Get started" page is displayed$/, async () => {
  await OnboardingMainPageAssert.assertSeeMainPage();
});

Then(/^"Legal page" is displayed$/, async () => {
  await OnboardingLegalPageAssert.assertSeeLegalPage();
});

Then(/^"Recovery phrase length page" is displayed and 24 words checkbox is checked$/, async () => {
  await OnboardingRecoveryPhraseLengthPageAssert.assertSeeRecoveryPhraseLengthPage();
});

Then(/^I select (12|15|24) word passphrase length$/, async (length: '12' | '15' | '24') => {
  await OnboardingPageObject.selectRecoveryPassphraseLength(length);
});

Then(/^"Help us improve your experience" page is displayed$/, async () => {
  await OnboardingDataCollectionPageAssert.assertSeeDataCollectionPage();
});

Then(/^"Mnemonic writedown" page is displayed with words (8|16|24) of 24$/, async (expectedWords: number) => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicWriteDownPage(expectedWords);
});

Then(/^"Mnemonic verification" page is displayed with words (8|16|24) of 24$/, async (expectedWords: number) => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicVerificationWordsPage(expectedWords, 24);
});

Then(/^"Mnemonic verification" page is displayed with words (8|12) of 12$/, async (expectedWords: number) => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicVerificationWordsPage(expectedWords, 12);
});

Then(/^"Mnemonic verification" page is displayed with words (8|15) of 15$/, async (expectedWords: number) => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicVerificationWordsPage(expectedWords, 15);
});

Then(/^"Connect Hardware Wallet" page is displayed$/, async () => {
  await OnboardingConnectHWPageAssert.assertSeeConnectHardwareWalletPage();
});

Then(/^"All done" page is displayed$/, async () => {
  await OnboardingAllDonePageAssert.assertSeeAllDonePage();
});

Then(/^"Creating wallet" page is displayed$/, async () => {
  await OnboardingWalletCreationPageAssert.assertSeeCreatingWalletPage();
});

Then(/^Creating wallet page finishes in < (\d*)s$/, async (duration: number) => {
  await OnboardingWalletCreationPageAssert.assertCreatingWalletDuration(duration);
});

Then(/^"Name your wallet" page is displayed$/, async () => {
  await OnboardingWalletNamePageAssert.assertSeeWalletNamePage();
});

Then(/^"Wallet password" page is displayed(| in "Forgot password" flow)$/, async (flow: string) => {
  const expectedFlow = flow === ' in "Forgot password" flow' ? 'forgot_password' : 'onboarding';
  await OnboardingWalletPasswordPageAssert.assertSeePasswordPage(expectedFlow);
});

Then(/^"Restoring a multi-address wallet\?" modal is displayed$/, async () => {
  await ModalAssert.assertSeeRestoringMultiAddressWalletModal();
});

Then(/^I accept "T&C" checkbox$/, async () => {
  await OnboardingPageObject.acceptTCCheckbox();
});

Given(/^I am on "Legal page"$/, async () => {
  await OnboardingPageObject.openLegalPage();
  await OnboardingLegalPageAssert.assertSeeLegalPage();
});

Given(/^I am on "Lace terms of use" page and accept terms$/, async () => {
  await OnboardingPageObject.openAndAcceptTermsOfUsePage();
});

Given(/^I am on "Help us improve your experience" page$/, async () => {
  await OnboardingDataCollectionPageAssert.assertSeeDataCollectionPage();
});

Given(/^I am on "Name your wallet" page$/, async () => {
  await OnboardingPageObject.openNameYourWalletPage();
  await OnboardingWalletNamePageAssert.assertSeeWalletNamePage();
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

Given(/^I am on "All done" page$/, async () => {
  await OnboardingPageObject.openAllDonePage();
  await OnboardingWalletCreationPageAssert.assertSeeCreatingWalletPage();
  await OnboardingAllDonePageAssert.assertSeeAllDonePage();
});

Given(
  /^I am on "All done" page with analytics tracking (Skip|Agree) from (Create|Restore) wallet$/,
  async (isTrackingEnabled: 'Skip' | 'Agree', onboardingType: 'Create' | 'Restore') => {
    await OnboardingPageObject.openAndAcceptTermsOfUsePage();
    await (isTrackingEnabled === 'Skip'
      ? OnboardingAnalyticsPage.skipButton.click()
      : OnboardingAnalyticsPage.nextButton.click());
    await OnboardingPageObject.fillWalletNameInput('Test wallet');
    await OnboardingWalletNamePage.nextButton.click();
    await OnboardingPageObject.fillPasswordPage(validPassword, validPassword);
    await OnboardingWalletPasswordPage.nextButton.click();
    await OnboardingMnemonicInfoPage.nextButton.click();
    switch (onboardingType) {
      case 'Create':
        await OnboardingPageObject.openMnemonicVerificationLastPage();
        break;
      case 'Restore':
        await OnboardingPageObject.openMnemonicVerificationLastPage(mnemonicWords);
        break;
    }
    await OnboardingMnemonicPage.nextButton.click();
    await OnboardingAllDonePageAssert.assertSeeAllDonePage();
  }
);

Given(/^I am on "All done!" page from "Restore wallet" using "([^"]*)" wallet$/, async (walletName: string) => {
  await OnboardingPageObject.openAllDonePageFromWalletRestore(getTestWallet(walletName).mnemonic ?? []);
});

Given(
  /^I am on "Enter your secret passphrase" with (12|15|24) words page from "Restore wallet" process$/,
  async (length: '12' | '15' | '24') => {
    await OnboardingPageObject.goToMnemonicWriteDownPage(length);
  }
);

Given(
  /^I fill passphrase with incorrect mnemonic (12|15|24) words on each page$/,
  async (length: '12' | '15' | '24') => {
    const invalidMnemonic = [...invalidMnemonicWords];
    switch (length) {
      case '12':
        invalidMnemonic.splice(12);
        break;
      case '15':
        invalidMnemonic.splice(15);
        break;
      case '24':
        break;
    }
    await OnboardingPageObject.openMnemonicVerificationLastPage(invalidMnemonic, length);
  }
);

Given(
  /^I fill passphrase fields using 24 words mnemonic on (8\/24|16\/24|24\/24) page$/,
  async (pageNumber: string) => {
    switch (pageNumber) {
      case '8/24':
        await OnboardingPageObject.fillMnemonicFields(mnemonicWords, 0);
        break;
      case '16/24':
        await OnboardingPageObject.fillMnemonicFields(mnemonicWords, 8);
        break;
      case '24/24':
        await OnboardingPageObject.fillMnemonicFields(mnemonicWords, 16);
        break;
    }
  }
);

Given(/^I fill passphrase fields using 12 words mnemonic on (8\/12|12\/12) page$/, async (pageNumber: string) => {
  switch (pageNumber) {
    case '8/12':
      await OnboardingPageObject.fillMnemonicFields(twelveMnemonicWords, 0);
      break;
    case '12/12':
      await OnboardingPageObject.fillMnemonicFields(twelveMnemonicWords, 8);
      break;
  }
});

Given(/^I fill passphrase fields using 15 words mnemonic on (8\/15|15\/15) page$/, async (pageNumber: string) => {
  switch (pageNumber) {
    case '8/15':
      await OnboardingPageObject.fillMnemonicFields(fifteenMnemonicWords, 0);
      break;
    case '15/15':
      await OnboardingPageObject.fillMnemonicFields(fifteenMnemonicWords, 8);
      break;
  }
});

Then(/^I save the words$/, async () => {
  mnemonicWordsForReference.push(...(await OnboardingMnemonicPage.getMnemonicWordTexts()));
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
  await OnboardingPageObject.fillMnemonicInput(value);
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

Then(/^There is tooltip visible$/, async () => {
  await OnboardingLegalPageAssert.assertTooltipVisible();
});

Then(/^There is no tooltip visible$/, async () => {
  await OnboardingLegalPageAssert.assertNoTooltipVisible();
});

Then(/^I hover over "Next" button$/, async () => {
  await OnboardingPageObject.hoverOverNextButton();
});

Then(/^I change one random field$/, async () => {
  await OnboardingPageObject.changeRandomMnemonicField();
});

Then(/^"Mnemonic info" page is displayed$/, async () => {
  await OnboardingMnemonicInfoPageAssert.assertSeeMnemonicInfoPage();
});

Then(/^I navigate to "Mnemonic info" page$/, async () => {
  await OnboardingMainPage.createWalletButton.click();
  await OnboardingPageObject.openNameYourWalletPage();
  await OnboardingPageObject.fillWalletNameInput('ValidName');
  await OnboardingWalletNamePage.nextButton.click();
  await OnboardingPageObject.fillPasswordPage(validPassword, validPassword);
  await OnboardingWalletPasswordPage.nextButton.click();
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
  await OnboardingPageObject.openAllDonePage();
  await OnboardingAllDonePageAssert.assertSeeAllDonePage();
  await OnboardingAllDonePage.nextButton.click();
  await TopNavigationAssert.assertLogoPresent();
  await Modal.cancelButton.waitForDisplayed();
  await Modal.cancelButton.click();
  await settingsExtendedPageObject.switchNetwork('Preprod', 'extended');
  const newCreatedWallet: WalletConfig = {
    password: 'N_8J@bne87A',
    name: 'newCreatedWallet',
    walletLocalStorageData: {
      wallet: await localStorageManager.getItem('wallet'),
      lock: await localStorageManager.getItem('lock'),
      keyAgentData: await localStorageManager.getItem('keyAgentData'),
      analyticsAccepted: await localStorageManager.getItem('analyticsAccepted'),
      appSettings: defaultAppSettings
    },
    backgroundStorage: {
      mnemonic: await getBackgroundStorageItem('mnemonic'),
      keyAgentsByChain: await getBackgroundStorageItem('keyAgentsByChain')
    }
  };
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

Then(/^Privacy Policy is displayed in new tab$/, async () => {
  await switchToLastWindow();
  await OnboardingDataCollectionPageAssert.assertSeePrivacyPolicy();
});

When(
  /^I click on "(Cookie policy|Privacy policy|Terms of service)" legal link$/,
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service') => {
    await OnboardingPageObject.clickOnLegalLink(link);
  }
);

Then(/^I see incorrect passphrase error displayed$/, async () => {
  await OnboardingMnemonicPageAssert.assertSeeMnemonicError();
});

Then(
  /^"(Cookie policy|Privacy policy|Terms of service)" is displayed in new tab$/,
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service') => {
    await switchToLastWindow();
    await new OnboardingCommonAssert().assertLegalContentIsDisplayed(link);
  }
);

Then(/^"Next" button is (enabled|disabled) during onboarding process$/, async (state: 'enabled' | 'disabled') => {
  await OnboardingLegalPageAssert.assertNextButtonEnabled(state === 'enabled');
});

When(
  /^I click "(Got it|Learn more)" button on "DApp connector is now in Beta" modal$/,
  async (button: 'Got it' | 'Learn more') => {
    // Wait for main page to finish loading
    await MainLoader.component.waitForDisplayed({ reverse: true, timeout: 15_000 });
    if (button === 'Got it') {
      await Modal.cancelButton.waitForClickable();
      await Modal.cancelButton.click();
    } else {
      await Modal.confirmButton.waitForClickable();
      await Modal.confirmButton.click();
    }
  }
);

Then(/^wallet name error "([^"]*)" (is|is not) displayed$/, async (errorText: string, isDisplayed: 'is' | 'is not') => {
  const expectedMessage = await t(errorText);
  await OnboardingWalletNamePageAssert.assertSeeWalletNameError(expectedMessage, isDisplayed === 'is');
});

When(/^I click "Help and support" button during wallet setup$/, async () => {
  await new CommonOnboardingElements().helpAndSupportButton.click();
});

When(/^I click "here." link on "Keeping your wallet secure" page$/, async () => {
  await OnboardingMnemonicInfoPage.hereLink.click();
});

Given(/^I restore a wallet$/, async () => {
  await OnboardingPageObject.restoreWallet();
});

Given(/^I see current onboarding page in (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await CommonAssert.assertSeeThemeMode(mode);
});
