/* eslint-disable max-len */
import { DataTable, Given, Then, When } from '@wdio/cucumber-framework';
import settingsExtendedPageObject from '../pageobject/settingsExtendedPageObject';
import drawerGeneralSettingsAssert from '../assert/settings/drawerGeneralSettingsAssert';
import settingsPageExtendedAssert from '../assert/settings/settingsPageExtendedAssert';
import drawerCommonExtendedAssert from '../assert/drawerCommonExtendedAssert';
import simpleTxSideDrawerPageObject from '../pageobject/simpleTxSideDrawerPageObject';
import localStorageInitializer from '../fixture/localStorageInitializer';
import publicKeyDrawerAssert from '../assert/settings/publicKeyDrawerAssert';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';
import drawerNetworkSettingsAssert from '../assert/settings/drawerNetworkSettingsAssert';
import drawerTermsAndConditionsSettingsAssert from '../assert/settings/drawerTermsAndConditionsSettingsAssert';
import drawerPrivacyPolicySettingsAssert from '../assert/settings/drawerPrivacyPolicySettingsAssert';
import drawerHelpSettingsAssert from '../assert/settings/drawerHelpSettingsAssert';
import { t } from '../utils/translationService';
import passphraseDrawerAssert from '../assert/settings/passphraseDrawerAssert';
import PassphraseDrawer from '../elements/settings/extendedView/passphraseDrawer';
import localStorageAssert from '../assert/localStorageAssert';
import collateralDrawerAssert from '../assert/settings/collateralDrawerAssert';
import CookiePolicyDrawerAssert from '../assert/settings/CookiePolicyDrawerAssert';
import Modal from '../elements/modal';
import WalletAddressPage from '../elements/walletAddressPage';
import { browser } from '@wdio/globals';
import CollateralSettingsDrawer from '../elements/settings/extendedView/collateralSettingsDrawer';

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
        ? simpleTxSideDrawerPageObject.clickCloseDrawerButton()
        : simpleTxSideDrawerPageObject.clickBackDrawerButton());
    }
  }
);

Then(/my local storage is fully initialized/, async () => {
  await localStorageInitializer.initializeLastStaking();
  await localStorageInitializer.initializeTrackingConsent(true);
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

When(/I click on "(Mainnet|Preprod|Preview)" radio button/, async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
  await settingsExtendedPageObject.clickOnNetworkRadioButton(network);
});

When(
  /^I switch network to: "(Mainnet|Preprod|Preview)" in (extended|popup) mode/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview', mode: 'extended' | 'popup') => {
    await settingsExtendedPageObject.switchNetwork(network, mode);
  }
);

Then(
  /Local storage appSettings contains info about network: "(Mainnet|Preprod|Preview)"/,
  async (network: 'Mainnet' | 'Preprod' | 'Preview') => {
    await localStorageAssert.assertLocalStorageContainNetwork(network);
  }
);

Then(/the Terms and Conditions copy is displayed/, async () => {
  await drawerTermsAndConditionsSettingsAssert.assertTermsAndConditionsContent();
});

Then(/the Privacy policy copy is displayed/, async () => {
  await drawerPrivacyPolicySettingsAssert.assertPrivacyPolicyContent();
});

Then(/^the Cookie policy drawer is displayed in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  if (mode === 'extended') {
    await CookiePolicyDrawerAssert.assertSeeDrawerNavigationTitle();
    await CookiePolicyDrawerAssert.assertSeeDrawerCloseButton();
  } else {
    await CookiePolicyDrawerAssert.assertSeeDrawerBackButton();
  }
  await CookiePolicyDrawerAssert.assertSeeCookiePolicyTitle();
  await CookiePolicyDrawerAssert.assertSeeCookiePolicyContent();
});

Then(/I see help details open in a drawer/, async () => {
  await drawerCommonExtendedAssert.assertSeeDrawerWithTitle(await t('browserView.settings.help.support.help'), false);
  await drawerHelpSettingsAssert.assertSeeHelpModal();
  await drawerHelpSettingsAssert.assertSeeCreateNewTicketKeyButton();
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

Then(/^"Show passphrase" button is displayed$/, async () => {
  await passphraseDrawerAssert.assertSeeShowPassphraseButton();
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

Then(/^all mnemonics from "([^"]*)" wallet are listed$/, async (walletName: string) => {
  const expectedMnemonics = getTestWallet(walletName).mnemonic;
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
  const password = type === 'correct' ? getTestWallet(TestWalletName.TestAutomationWallet).password : 'somePassword';
  await CollateralSettingsDrawer.passwordInput.waitForEnabled();
  await CollateralSettingsDrawer.passwordInput.setValue(password);
  await CollateralSettingsDrawer.collateralButton.waitForClickable();
  await CollateralSettingsDrawer.collateralButton.click();
});

When(/^I click "Reclaim collateral" button on collateral drawer$/, async () => {
  await CollateralSettingsDrawer.collateralButton.waitForClickable();
  await CollateralSettingsDrawer.collateralButton.click();
});
