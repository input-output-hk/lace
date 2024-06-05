/* eslint-disable max-len */
import { Given, Then, When } from '@wdio/cucumber-framework';
import { DataTable } from '@cucumber/cucumber';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import drawerGeneralSettingsAssert from '../assert/settings/YourKeysDrawerAssert';
import settingsPageExtendedAssert from '../assert/settings/SettingsPageAssert';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import localStorageInitializer from '../fixture/localStorageInitializer';
import publicKeyDrawerAssert from '../assert/settings/PublicKeyDrawerAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import drawerNetworkSettingsAssert from '../assert/settings/NetworkSettingsDrawerAssert';
import drawerTermsAndConditionsSettingsAssert from '../assert/settings/TermsAndConditionsSettingsDrawerAssert';
import PrivacyPolicyDrawerAssert from '../assert/settings/PrivacyPolicyDrawerAssert';
import drawerHelpSettingsAssert from '../assert/settings/HelpSettingsDrawerAssert';
import { t } from '../utils/translationService';
import passphraseDrawerAssert from '../assert/settings/PassphraseDrawerAssert';
import PassphraseDrawer from '../elements/settings/PassphraseDrawer';
import localStorageAssert from '../assert/localStorageAssert';
import collateralDrawerAssert from '../assert/settings/CollateralDrawerAssert';
import CookiePolicyDrawerAssert from '../assert/settings/CookiePolicyDrawerAssert';
import Modal from '../elements/modal';
import WalletAddressPage from '../elements/walletAddressPage';
import { browser } from '@wdio/globals';
import CollateralDrawer from '../elements/settings/CollateralDrawer';
import HelpDrawer from '../elements/settings/HelpDrawer';
import ModalAssert from '../assert/modalAssert';
import menuHeaderPageObject from '../pageobject/menuHeaderPageObject';
import SettingsPage from '../elements/settings/SettingsPage';
import extendedView from '../page/extendedView';
import popupView from '../page/popupView';
import type { NetworkType } from '../types/network';
import CommonDrawerElements from '../elements/CommonDrawerElements';

Given(
  /^I click on "(About|Your keys|Network|Authorized DApps|Show recovery phrase|Passphrase verification|FAQs|Help|Terms and conditions|Privacy policy|Cookie policy|Collateral)" setting$/,
  async (settingsElement) => {
    await settingsExtendedPageObject.clickSettingsItem(settingsElement);
  }
);

Then(/^I see collateral as: "(Active|Inactive)" in settings$/, async (state: 'Active' | 'Inactive') => {
  await collateralDrawerAssert.assertSeeCurrentCollateralState(state);
});

Then(
  /^click on the following settings in (extended|popup) view opens a drawer:$/,
  async (viewType: string, settings: DataTable) => {
    for (const row of settings.rows()) {
      await settingsExtendedPageObject.clickSettingsItem(await t(row[0]));
      await drawerCommonExtendedAssert.assertSeeDrawer(true);
      await (viewType === 'extended'
        ? new CommonDrawerElements().clickCloseDrawerButton()
        : new CommonDrawerElements().clickBackDrawerButton());
    }
  }
);

Then(/my local storage is fully initialized/, async () => {
  await localStorageInitializer.initializeLastStaking();
  await localStorageInitializer.initializeMode('light');
});

When(/^I click on About component$/, async () => {
  await settingsExtendedPageObject.clickOnAbout();
});

Then(/^I see settings page$/, async () => {
  await settingsPageExtendedAssert.assertSeeTitle();
});

Then(/^I see all category titles$/, async () => {
  await settingsPageExtendedAssert.assertSeeHeadings();
});

Then(/^I see all links in categories for (extended|popup) view$/, async (mode: 'popup' | 'extended') => {
  await settingsPageExtendedAssert.assertSeeSubHeadings(mode === 'popup');
});

Then(/^I see all descriptions in categories for (extended|popup) view/, async (mode: 'popup' | 'extended') => {
  await settingsPageExtendedAssert.assertSeeDescriptions(mode === 'popup');
});

Then(/^I see Show public key button$/, async () => {
  await drawerGeneralSettingsAssert.assertSeeShowPublicKeyButton();
});

Then(/^I see "About Lace" component$/, async () => {
  await settingsPageExtendedAssert.assertSeeAboutLaceComponent();
});

Then(/^I see Remove wallet section/, async () => {
  await settingsPageExtendedAssert.assertSeeRemoveWalletSection();
});

Then(/I click on Remove wallet button/, async () => {
  await settingsExtendedPageObject.clickOnRemoveWallet();
});

Then(/^I click on "Sync" button$/, async () => {
  await SettingsPage.clickSyncButton();
});

Then(/^I click on Show public key button$/, async () => {
  await settingsExtendedPageObject.clickOnShowPublicKey();
});

Then(/^I see "([^"]*)" wallet public key$/, async (walletName: string) => {
  await publicKeyDrawerAssert.assertSeePublicKey(getTestWallet(walletName));
});

Then(/^I see QR code$/, async () => {
  await publicKeyDrawerAssert.assertSeeQrCode();
});

Then(/^I see network radio buttons$/, async () => {
  await drawerNetworkSettingsAssert.assertSeeNetworkRadioButtons();
});

When(/I click on "(Mainnet|Preprod|Preview)" radio button/, async (network: NetworkType) => {
  await settingsExtendedPageObject.clickOnNetworkRadioButton(network);
});

When(
  /^I switch network to: "(Mainnet|Preprod|Preview)" in (extended|popup) mode/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview', mode: 'extended' | 'popup') => {
    await settingsExtendedPageObject.switchNetworkAndCloseDrawer(network, mode);
  }
);

When(/^I switch network to: "(Mainnet|Preprod|Preview)" without closing drawer/, async (network: NetworkType) => {
  await settingsExtendedPageObject.switchNetworkWithoutClosingDrawer(network);
});

Then(
  /Local storage appSettings contains info about network: "(Mainnet|Preprod|Preview)"/,
  async (network: NetworkType) => {
    await localStorageAssert.assertLocalStorageContainNetwork(network);
  }
);

Then(
  /Local storage unconfirmedTransaction contains tx with type: "(internal|external)"/,
  async (txType: 'internal' | 'external') => {
    await localStorageAssert.assertLocalStorageContainsUnconfirmedTransaction(txType);
  }
);

Then(/Local storage unconfirmedTransaction is empty/, async () => {
  await localStorageAssert.assertLocalStorageUnconfirmedTransactionsIsEmpty();
});

Then(
  /I set (valid|outdated) unconfirmedTransaction entry in Local storage with type: "(internal|external)"/,
  async (typeOfEntry: 'valid' | 'outdated', creationType: 'internal' | 'external') => {
    const date = new Date();
    if (typeOfEntry === 'outdated') {
      date.setDate(date.getDate() - 7);
    }
    const entry = {
      id: 'someId',
      date: date.toString(),
      creationType
    };
    await localStorageInitializer.initializeUnconfirmedTransactions(JSON.stringify(entry));
  }
);

Then(/the Terms and Conditions copy is displayed/, async () => {
  await drawerTermsAndConditionsSettingsAssert.assertTermsAndConditionsContent();
});

Then(/the Privacy policy copy is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  if (mode === 'extended') {
    await PrivacyPolicyDrawerAssert.assertSeeDrawerCloseButton();
    await PrivacyPolicyDrawerAssert.assertSeeDrawerNavigationTitle();
  } else {
    await PrivacyPolicyDrawerAssert.assertSeeDrawerBackButton();
  }
  await PrivacyPolicyDrawerAssert.assertSeePrivacyPolicyTitle();
  await PrivacyPolicyDrawerAssert.assertSeePrivacyPolicyContent();
});

Then(/^the Cookie policy drawer is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  if (mode === 'extended') {
    await CookiePolicyDrawerAssert.assertSeeDrawerCloseButton();
    await CookiePolicyDrawerAssert.assertSeeDrawerNavigationTitle();
  } else {
    await CookiePolicyDrawerAssert.assertSeeDrawerBackButton();
  }
  await CookiePolicyDrawerAssert.assertSeeCookiePolicyTitle();
  await CookiePolicyDrawerAssert.assertSeeCookiePolicyContent();
});

Then(/^I see help details drawer in (extended|popup) mode/, async (mode: 'extended' | 'popup') => {
  await drawerHelpSettingsAssert.assertSeeHelpDrawer(mode);
});

Then(/^"Create a support ticket" button (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await drawerHelpSettingsAssert.assertSeeCreateASupportTicketButton(shouldBeDisplayed === 'is');
});

When(/^I click "Create a support ticket" button on Help drawer$/, async () => {
  await HelpDrawer.createASupportTicketButton.waitForClickable();
  await HelpDrawer.createASupportTicketButton.click();
});

Then(/I see analytics option with proper description and toggle/, async () => {
  await settingsPageExtendedAssert.assertSeeAnalyticsSection();
});

When(/Analytics toggle is enabled: (true|false)/, async (isEnabled: 'true' | 'false') => {
  await settingsExtendedPageObject.toggleAnalytics(isEnabled);
});

Then(/^Side drawer "Show 24-word passphrase" is displayed$/, async () => {
  await passphraseDrawerAssert.assertSeeDrawerTitle(
    await t('browserView.settings.security.showPassphraseDrawer.title')
  );
  await passphraseDrawerAssert.assertSeePassphraseDescription(
    await t('browserView.settings.security.showPassphraseDrawer.description')
  );
  await passphraseDrawerAssert.assertSeeBannerIcon();
  await passphraseDrawerAssert.assertSeeBannerDescription(
    await t('browserView.settings.security.showPassphraseDrawer.warning')
  );
});

Then(/^"Password" field is displayed$/, async () => {
  await passphraseDrawerAssert.assertSeePasswordInputContainer();
});

Then(/^"Show passphrase" button (is|is not) displayed$/, async (isDisplayed: 'is' | 'is not') => {
  await passphraseDrawerAssert.assertSeeShowPassphraseButton(isDisplayed === 'is');
});

Then(/^"Hide passphrase" button is displayed$/, async () => {
  await passphraseDrawerAssert.assertSeeHidePassphraseButton();
});

When(
  /^I click on "(Show passphrase|Hide passphrase)" button$/,
  async (buttonType: 'Show passphrase' | 'Hide passphrase') => {
    buttonType === 'Show passphrase'
      ? await PassphraseDrawer.showPassphraseButton.click()
      : await PassphraseDrawer.hidePassphraseButton.click();
  }
);

Then(
  /^"(Show passphrase|Hide passphrase)" button is (enabled|disabled) on "Show 24-word recovery phrase" drawer$/,
  async (button: 'Show passphrase' | 'Hide passphrase', state: 'enabled' | 'disabled') => {
    await (button === 'Show passphrase'
      ? passphraseDrawerAssert.assertShowPassphraseButtonEnabled(state === 'enabled')
      : passphraseDrawerAssert.assertHidePassphraseButtonEnabled(state === 'enabled'));
  }
);

Then(/^all mnemonics from "([^"]*)" wallet are listed$/, async (walletName: string) => {
  const expectedMnemonics = getTestWallet(walletName).mnemonic ?? [];
  await passphraseDrawerAssert.assertAllMnemonicsAreListed(expectedMnemonics);
});

Then(/^all mnemonics (are|are not) blurred$/, async (areBlurred) => {
  await passphraseDrawerAssert.assertAllMnemonicsAreBlurred(areBlurred === 'are not');
});

Then(/^"Show recovery phrase" option is displayed as 1st one under "Security" section$/, async () => {
  await settingsPageExtendedAssert.assertShowRecoveryPhraseIsDisplayedUnderSecuritySection();
});

Then(/^all elements of (Inactive|Active) collateral drawer are displayed$/, async (state: 'Active' | 'Inactive') => {
  await collateralDrawerAssert.assertSeeCollateralDrawer(state);
});

Then(/^Collateral drawer with not enough ADA error is displayed$/, async () => {
  await collateralDrawerAssert.assertSeeCollateralNotEnoughAdaDrawer();
});

Then(/^"Remove wallet" modal (is|is not) displayed$/, async (shouldBeDisplayed: 'is' | 'is not') => {
  await ModalAssert.assertSeeRemoveWalletModal(shouldBeDisplayed === 'is');
});

When(/^I click "(Back|Remove wallet)" button on "Remove wallet" modal$/, async (button: 'Back' | 'Remove wallet') => {
  await browser.pause(500);
  switch (button) {
    case 'Back':
      await Modal.cancelButton.click();
      break;
    case 'Remove wallet':
      await Modal.confirmButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

When(/^I remove wallet$/, async () => {
  await menuHeaderPageObject.openSettings();
  await settingsExtendedPageObject.clickOnRemoveWallet();
  await Modal.confirmButton.click();
});

Then(/^I see "Show public key" page in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await publicKeyDrawerAssert.assertSeePublicKeyPage(mode);
  await publicKeyDrawerAssert.assertSeeWalletName(getTestWallet(TestWalletName.TestAutomationWallet));
});

Then(/^I (see|do not see) "Copy" button on "Show public key" page$/, async (shouldSee) => {
  await publicKeyDrawerAssert.assertSeeCopyButton(shouldSee === 'see');
});

When(/^I click "Copy" button on "Show public key" page$/, async () => {
  await WalletAddressPage.copyButton.click();
});

When(/^I fill (correct|incorrect) password and confirm collateral$/, async (type: string) => {
  const password =
    type === 'correct' ? String(getTestWallet(TestWalletName.TestAutomationWallet).password) : 'somePassword';
  await CollateralDrawer.passwordInput.waitForClickable();
  await CollateralDrawer.passwordInput.setValue(password);
  await CollateralDrawer.collateralButton.waitForClickable();
  await CollateralDrawer.collateralButton.click();
});

When(/^I click "Reclaim collateral" button on collateral drawer$/, async () => {
  await CollateralDrawer.collateralButton.waitForClickable();
  await CollateralDrawer.collateralButton.click();
});

When(/^I reclaim collateral \(if active\) in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  mode === 'extended' ? await extendedView.visitSettings() : await popupView.visitSettings();
  if ((await SettingsPage.collateralLink.addon.getText()) === 'Active') {
    await settingsExtendedPageObject.clickSettingsItem('Collateral');
    await CollateralDrawer.collateralButton.waitForClickable();
    await CollateralDrawer.collateralButton.click();
  }
});

When(/^I set theme switch in settings to (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await settingsExtendedPageObject.setExtensionTheme(mode);
});

Then(/^I see current network: "(Mainnet|Preprod|Preview)" name in network setting$/, async (network: NetworkType) => {
  await settingsPageExtendedAssert.assertSeeCurrentNetworkName(network);
});

Then(
  /^I see current network: "(Mainnet|Preprod|Preview)" name in "About Lace" widget$/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    await settingsPageExtendedAssert.assertSeeNetworkInAboutComponent(network);
  }
);
