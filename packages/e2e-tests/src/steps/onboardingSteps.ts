import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import { t } from '../utils/translationService';
import CommonOnboardingElements from '../elements/onboarding/commonOnboardingElements';
import Modal from '../elements/modal';
import OnboardingCommonAssert from '../assert/onboarding/onboardingCommonAssert';
import OnboardingMainPage from '../elements/onboarding/mainPage';
import OnboardingMainPageAssert from '../assert/onboarding/onboardingMainPageAssert';
import OnboardingWalletSetupPage from '../elements/onboarding/walletSetupPage';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import TokensPageAssert from '../assert/tokensPageAssert';
import TopNavigationAssert from '../assert/topNavigationAssert';
import testContext from '../utils/testContext';
import CommonAssert from '../assert/commonAssert';
import { browser } from '@wdio/globals';
import type { RecoveryPhrase } from '../types/onboarding';
import { generateRandomString } from '../utils/textUtils';
import onboardingRecoveryPhrasePageAssert from '../assert/onboarding/onboardingRecoveryPhrasePageAssert';
import RecoveryPhrasePage from '../elements/onboarding/recoveryPhrasePage';
import onboardingWatchVideoModalAssert from '../assert/onboarding/onboardingWatchVideoModalAssert';
import watchVideoModal from '../elements/onboarding/watchVideoModal';
import analyticsBanner from '../elements/analyticsBanner';
import { getWalletsFromRepository } from '../fixture/walletRepositoryInitializer';
import OnboardingWalletSetupPageAssert from '../assert/onboarding/onboardingWalletSetupPageAssert';
import OnboardingAnalyticsBannerAssert from '../assert/onboarding/onboardingAnalyticsBannerAssert';
import { shuffle } from '../utils/arrayUtils';
import ConnectYourDevicePageAssert from '../assert/onboarding/ConnectYourDevicePageAssert';
import ModalAssert from '../assert/modalAssert';

const mnemonicWords: string[] = getTestWallet(TestWalletName.TestAutomationWallet).mnemonic ?? [];
const invalidMnemonicWords: string[] = getTestWallet(TestWalletName.InvalidMnemonic).mnemonic ?? [];
const twelveMnemonicWords: string[] = getTestWallet(TestWalletName.TwelveWordsMnemonic).mnemonic ?? [];
const fifteenMnemonicWords: string[] = getTestWallet(TestWalletName.FifteenWordsMnemonic).mnemonic ?? [];

const mnemonicWordsForReference: string[] = [];

When(
  /^I click "(Create|Connect|Restore)" button on wallet setup page$/,
  async (button: 'Create' | 'Connect' | 'Restore') => {
    await OnboardingMainPage.clickOnOnboardingTypeButton(button);
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

Then(/^I (see|do not see) "Are you sure you want to start again\?" modal$/, async (state: 'see' | 'do not see') => {
  await ModalAssert.assertSeeOnboardingStartAgainModal(state === 'see');
});

When(
  /^I click "(Cancel|OK)" button on "(Restoring a multi-address wallet\?|Are you sure you want to start again\?)" modal$/,
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

When(/^I enter wallet name: "([^"]*)"$/, async (walletName: string) => {
  await OnboardingWalletSetupPage.setWalletNameInput(walletName === 'empty' ? '' : walletName);
});

When(/^I enter wallet name with size of: ([^"]*) characters$/, async (numberOfCharacters: number) => {
  const walletName = await generateRandomString(numberOfCharacters);
  await OnboardingWalletSetupPage.setWalletNameInput(walletName);
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

Then(/^"Connect your device" page is displayed$/, async () => {
  await ConnectYourDevicePageAssert.assertSeeConnectYourDevicePage();
});

Then(/^"No hardware wallet device was chosen." error is displayed on "Connect your device" page$/, async () => {
  await ConnectYourDevicePageAssert.assertSeeError(
    await t('core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.devicePickerRejected')
  );
});

When(/^"Try again" button is enabled on "Connect your device" page$/, async () => {
  await ConnectYourDevicePageAssert.assertSeeTryAgainButton(true);
  await ConnectYourDevicePageAssert.assertSeeTryAgainButtonEnabled(true);
});

Then(/^I clear saved words$/, async () => {
  mnemonicWordsForReference.length = 0;
});

When(/^I fill mnemonic input with "([^"]*)"$/, async (value: string) => {
  await RecoveryPhrasePage.enterMnemonicWord(value, 0, false);
});

When(/^I click on mnemonic input$/, async () => {
  await RecoveryPhrasePage.clickOnInput();
});

When(/^I add characters "([^"]*)" in word ([0-7])$/, async (characters: string, inputNumber: number) => {
  await RecoveryPhrasePage.addCharToMnemonicField(characters, inputNumber);
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
  await RecoveryPhrasePage.changeRandomMnemonicField();
});

Then(/^I clear one random field$/, async () => {
  await RecoveryPhrasePage.clearRandomMnemonicField();
});

Then(/^I see following autocomplete options:$/, async (options: DataTable) => {
  await onboardingRecoveryPhrasePageAssert.assertSeeMnemonicAutocompleteOptions(dataTableAsStringArray(options));
});

Then(/^I click header to lose focus$/, async () => {
  await RecoveryPhrasePage.clickHeaderToLoseFocus();
});

Then(/^I do not see autocomplete options list$/, async () => {
  await onboardingRecoveryPhrasePageAssert.assertNotSeeMnemonicAutocompleteOptions();
});

Given(/^I create new wallet and save wallet information$/, async () => {
  await OnboardingMainPage.createWalletButton.click();
  await OnboardingWalletSetupPage.goToWalletSetupPage('Create', mnemonicWords, true);
  await OnboardingWalletSetupPageAssert.assertSeeWalletSetupPage();
  await OnboardingWalletSetupPage.clickEnterWalletButton();
  await TopNavigationAssert.assertLogoPresent();
  await settingsExtendedPageObject.switchNetworkAndCloseDrawer('Preprod', 'extended');
  const newCreatedWallet = JSON.stringify(await getWalletsFromRepository());
  testContext.save('newCreatedWallet', newCreatedWallet);
});

Then(/^the mnemonic input contains the word "([^"]*)"$/, async (expectedWord: string) => {
  await onboardingRecoveryPhrasePageAssert.assertSeeMnemonicInputWithText(0, expectedWord);
});

Then(/^the word in mnemonic input has only ([^"]*) characters$/, async (expectedLength: string) => {
  await onboardingRecoveryPhrasePageAssert.assertMnemonicInputLength(0, Number(expectedLength));
});

When(
  /^I click on "(Cookie policy|Privacy policy|Terms of service)" legal link(?: on "(Main page)")?$/,
  async (link: 'Cookie policy' | 'Privacy policy' | 'Terms of service', page?: 'Main page') => {
    page === 'Main page'
      ? await OnboardingMainPage.clickOnLegalLink(link)
      : await new CommonOnboardingElements().clickOnLegalLinkOnFooter(link);
  }
);

Then(/^I (do not see|see) incorrect passphrase error displayed$/, async (shouldBeDisplayed: 'do not see' | 'see') => {
  await onboardingRecoveryPhrasePageAssert.assertSeeMnemonicError(shouldBeDisplayed === 'see');
});

Then(/^wallet name error "([^"]*)" (is|is not) displayed$/, async (errorText: string, isDisplayed: 'is' | 'is not') => {
  const expectedMessage = await t(errorText);
  await OnboardingWalletSetupPageAssert.assertSeeWalletNameError(expectedMessage, isDisplayed === 'is');
});

When(/^I click "Help and support" button during wallet setup$/, async () => {
  await new CommonOnboardingElements().helpAndSupportButton.click();
});

Given(/^I restore a wallet$/, async () => {
  await OnboardingMainPage.restoreWalletButton.click();
  await OnboardingWalletSetupPage.goToWalletSetupPage(
    'Restore',
    getTestWallet(TestWalletName.TestAutomationWallet).mnemonic ?? [],
    true
  );
  await OnboardingWalletSetupPage.clickEnterWalletButton();
  await TopNavigationAssert.assertLogoPresent();
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

When(/^I enter wallet password "([^"]*)"$/, async (password: string) => {
  await OnboardingWalletSetupPage.setWalletPasswordInput(password);
});

Then(/^empty password confirmation input (is|is not) displayed$/, async (state: 'is' | 'is not') => {
  await OnboardingWalletSetupPageAssert.assertSeeEmptyPasswordConfirmationInput(state === 'is');
});

When(/^I restore previously changed mnemonic word$/, async () => {
  await RecoveryPhrasePage.restorePreviousMnemonicWord();
});

Given(
  /^I go to "(Mnemonic verification|Wallet setup)" page(?: with wallet ([^"]*))? from "(Create|Restore)" wallet flow(?: and (fill|not fill) values)?$/,
  async (
    endPage: 'Mnemonic verification' | 'Wallet setup',
    walletName: string,
    flowType: 'Create' | 'Restore',
    fillValues: 'fill' | 'not fill'
  ) => {
    let mnemonicsToUse = mnemonicWords;
    if (walletName) mnemonicsToUse = getTestWallet(walletName).mnemonic ?? [];
    switch (endPage) {
      case 'Mnemonic verification':
        await RecoveryPhrasePage.goToMnemonicVerificationPage(flowType, mnemonicsToUse, fillValues === 'fill');
        break;
      case 'Wallet setup':
        await OnboardingWalletSetupPage.goToWalletSetupPage(flowType, mnemonicsToUse, fillValues === 'fill');
        break;
      default:
        throw new Error(`Unsupported page name: ${endPage}`);
    }
  }
);

Given(/^I click "Enter wallet" button$/, async () => {
  await OnboardingWalletSetupPage.clickEnterWalletButton();
});

Given(
  /^I enter (12|15|24) (correct|incorrect) mnemonic words on "Mnemonic verification" page$/,
  async (mnemonicWordsLength: RecoveryPhrase, isCorrect: 'correct' | 'incorrect') => {
    switch (mnemonicWordsLength) {
      case '12':
        await RecoveryPhrasePage.enterMnemonicWords(
          isCorrect === 'correct' ? twelveMnemonicWords : invalidMnemonicWords.slice(0, 12)
        );
        break;
      case '15':
        await RecoveryPhrasePage.enterMnemonicWords(
          isCorrect === 'correct' ? fifteenMnemonicWords : invalidMnemonicWords.slice(0, 15)
        );
        break;
      case '24':
        await RecoveryPhrasePage.enterMnemonicWords(isCorrect === 'correct' ? mnemonicWords : invalidMnemonicWords);
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

When(/^I click "Got it" link in "Keeping your wallet secure" modal$/, async () => {
  await watchVideoModal.gotItButton.click();
});

When(/^I save mnemonic words$/, async () => {
  mnemonicWordsForReference.length = 0;
  mnemonicWordsForReference.push(...(await RecoveryPhrasePage.getMnemonicWordTexts()));
});

When(/^I enter saved mnemonic words$/, async () => {
  await RecoveryPhrasePage.enterMnemonicWords(mnemonicWordsForReference);
});

When(
  /^I hover over "(Copy to clipboard|Paste from clipboard)" button$/,
  async (clipboardType: 'Copy to clipboard' | 'Paste from clipboard') => {
    switch (clipboardType) {
      case 'Copy to clipboard':
        await RecoveryPhrasePage.copyToClipboardButton.moveTo();
        break;
      case 'Paste from clipboard':
        await RecoveryPhrasePage.pasteFromClipboardButton.moveTo();
        break;
      default:
        throw new Error(`Unsupported clipboard type: ${clipboardType}`);
    }
  }
);

When(/^I click on "clipboard tooltip link"$/, async () => {
  await RecoveryPhrasePage.clipboardTooltipLink.click();
});

Then(/^I see clipboard tooltip with information about copying and pasting words$/, async () => {
  await onboardingRecoveryPhrasePageAssert.assertSeeClipboardTooltip();
});

When(
  /^I click on "(Copy to clipboard|Paste from clipboard)" button$/,
  async (button: 'Copy to clipboard' | 'Paste from clipboard') => {
    switch (button) {
      case 'Copy to clipboard':
        await RecoveryPhrasePage.clickOnCopyToClipboardButton();
        break;
      case 'Paste from clipboard':
        await RecoveryPhrasePage.clickOnPasteFromClipboardButton();
        break;
      default:
        throw new Error(`Unsupported button : ${button}`);
    }
  }
);

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

When(/^I fill passphrase fields using saved 24 words mnemonic in incorrect order$/, async () => {
  const shuffledWords = shuffle([...mnemonicWordsForReference]);
  await RecoveryPhrasePage.enterMnemonicWords(shuffledWords);
});

Then(
  /^"(Recovery phrase|Wallet setup|Enter wallet)" step is marked as active on progress timeline$/,
  async (step: 'Recovery phrase' | 'Wallet setup' | 'Enter wallet') => {
    await new OnboardingCommonAssert().assertSeeActiveStepOnProgressTimeline(step);
  }
);

When(
  /^I click on "(Show|Hide) password" for "(Password|Confirm password)" input field$/,
  async (action: 'Show' | 'Hide', field: 'Password' | 'Confirm password') => {
    await OnboardingWalletSetupPage.switchPasswordVisibility(action, field);
  }
);

Then(
  /^password value is (visible|hidden) for "(Password|Confirm password)" input field$/,
  async (isVisible: 'visible' | 'hidden', field: 'Password' | 'Confirm password') => {
    field === 'Password'
      ? await OnboardingWalletSetupPageAssert.assertPasswordIsVisible(isVisible === 'visible')
      : await OnboardingWalletSetupPageAssert.assertConfirmPasswordIsVisible(isVisible === 'visible');
  }
);
