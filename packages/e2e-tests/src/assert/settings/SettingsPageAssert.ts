import SettingsPage from '../../elements/settings/SettingsPage';
import { t } from '../../utils/translationService';
import { expect } from 'chai';
import { browser } from '@wdio/globals';

class SettingsPageAssert {
  async assertSeeSubHeadings(popupView = false) {
    if (popupView) {
      expect(await SettingsPage.aboutLink.getTitleText()).to.equal(await t('browserView.settings.wallet.about.title'));
    }
    expect(await SettingsPage.networkLink.getTitleText()).to.equal(
      await t('browserView.settings.wallet.network.title')
    );
    expect(await SettingsPage.customSubmitAPILink.getTitleText()).to.equal(
      await t('browserView.settings.wallet.customSubmitApi.settingsLinkTitle')
    );
    expect(await SettingsPage.authorizedDAppsLink.getTitleText()).to.equal(
      await t('browserView.settings.wallet.authorizedDApps.title')
    );
    expect(await SettingsPage.yourKeysLink.getTitleText()).to.equal(
      await t('browserView.settings.wallet.general.title')
    );
    expect(await SettingsPage.collateralLink.getTitleText()).to.equal(
      await t('browserView.settings.wallet.collateral.title')
    );
    expect(await SettingsPage.hdWalletSyncLink.getTitleText()).to.equal(
      await t('browserView.settings.wallet.walletSync.title')
    );
    expect(await SettingsPage.currencyLink.getTitleText()).to.equal(
      await t('browserView.settings.preferences.currency.title')
    );
    expect(await SettingsPage.themeLink.getTitleText()).to.equal(
      await t('browserView.settings.preferences.theme.title')
    );
    expect(await SettingsPage.betaProgramLink.getTitleText()).to.equal(
      await t('browserView.settings.preferences.betaProgram.title')
    );
    expect(await SettingsPage.debuggingLink.getTitleText()).to.equal(
      await t('browserView.settings.preferences.debugging.title')
    );
    expect(await SettingsPage.showRecoveryPhraseLink.getTitleText()).to.equal(
      await t('browserView.settings.security.showPassphrase.title')
    );
    if (!popupView) {
      expect(await SettingsPage.generatePaperWallet.getTitleText()).to.equal(
        await t('browserView.settings.generatePaperWallet.title')
      );
    }
    // TODO: temporarily disabled due to LW-2907
    // expect(await SettingsPage.passphraseVerificationLink.getTitleText()).to.equal(
    //   await t('browserView.settings.security.passphrasePeriodicVerification.title')
    // );
    expect(await SettingsPage.analyticsLink.getTitleText()).to.equal(
      await t('browserView.settings.security.analytics.title')
    );
    expect(await SettingsPage.faqsLink.getTitleText()).to.equal(await t('browserView.settings.help.faqs.title'));
    expect(await SettingsPage.helpLink.getTitleText()).to.equal(await t('browserView.settings.help.support.help'));
    expect(await SettingsPage.tncLink.getTitleText()).to.equal(await t('browserView.settings.legal.tnc.title'));
    expect(await SettingsPage.privacyPolicyLink.getTitleText()).to.equal(
      await t('browserView.settings.legal.privacyPolicy.title')
    );
    expect(await SettingsPage.cookiePolicy.getTitleText()).to.equal(
      await t('browserView.settings.legal.cookiePolicy.title')
    );
  }

  async assertSeeDescriptions(popupView = false) {
    if (popupView) {
      expect(await SettingsPage.aboutLink.getDescriptionText()).to.equal(
        await t('browserView.settings.wallet.about.description')
      );
    }
    expect(await SettingsPage.networkLink.getDescriptionText()).to.equal(
      await t('browserView.settings.wallet.network.description')
    );
    expect(await SettingsPage.customSubmitAPILink.getDescriptionText()).to.equal(
      await t('browserView.settings.wallet.customSubmitApi.settingsLinkDescription')
    );
    expect(await SettingsPage.authorizedDAppsLink.getDescriptionText()).to.equal(
      await t('browserView.settings.wallet.authorizedDApps.description')
    );
    expect(await SettingsPage.yourKeysLink.getDescriptionText()).to.equal(
      await t('browserView.settings.wallet.general.description')
    );
    expect(await SettingsPage.collateralLink.getDescriptionText()).to.equal(
      await t('browserView.settings.wallet.collateral.description')
    );
    expect(await SettingsPage.hdWalletSyncLink.getDescriptionText()).to.equal(
      await t('browserView.settings.wallet.walletSync.description')
    );
    expect(await SettingsPage.currencyLink.getDescriptionText()).to.equal(
      await t('browserView.settings.preferences.currency.description')
    );
    expect(await SettingsPage.themeLink.getDescriptionText()).to.equal(
      await t('browserView.settings.preferences.theme.description')
    );
    expect(await SettingsPage.betaProgramLink.getDescriptionText()).to.equal(
      await t('browserView.settings.preferences.betaProgram.description')
    );
    expect(await SettingsPage.debuggingLink.getDescriptionText()).to.equal(
      await t('browserView.settings.preferences.debugging.description')
    );
    expect(await SettingsPage.showRecoveryPhraseLink.getDescriptionText()).to.equal(
      await t('browserView.settings.security.showPassphrase.description')
    );
    if (!popupView) {
      expect(await SettingsPage.generatePaperWallet.getDescriptionText()).to.equal(
        await t('browserView.settings.generatePaperWallet.description')
      );
    }
    // TODO: temporarily disabled due to LW-2907
    // expect(await SettingsPage.passphraseVerificationLink.getDescriptionText()).to.equal(
    //   await t('browserView.settings.security.passphrasePeriodicVerification.description')
    // );
    expect(await SettingsPage.analyticsLink.getDescriptionText()).to.equal(
      await t('browserView.settings.security.analytics.description')
    );
    expect(await SettingsPage.faqsLink.getDescriptionText()).to.equal(
      await t('browserView.settings.help.faqs.description')
    );
    expect(await SettingsPage.helpLink.getDescriptionText()).to.equal(
      await t('browserView.settings.help.support.createASupportTicket')
    );
    expect(await SettingsPage.tncLink.getDescriptionText()).to.equal(
      await t('browserView.settings.legal.tnc.description')
    );
    expect(await SettingsPage.privacyPolicyLink.getDescriptionText()).to.equal(
      await t('browserView.settings.legal.privacyPolicy.description')
    );
    expect(await SettingsPage.cookiePolicy.getDescriptionText()).to.equal(
      await t('browserView.settings.legal.cookiePolicy.description')
    );
    expect(await SettingsPage.removeWalletDescription.getText()).to.equal(
      await t('browserView.settings.wallet.general.removeWalletDescription')
    );
  }

  async assertSeeTitle() {
    await SettingsPage.mainTitle.waitForDisplayed();
    expect(await SettingsPage.mainTitle.getText()).to.equal(await t('browserView.settings.heading'));
  }

  async assertSeeHeadings() {
    expect(await SettingsPage.walletHeader.getText()).to.equal(await t('browserView.settings.wallet.title'));
    expect(await SettingsPage.preferencesHeader.getText()).to.equal(await t('browserView.settings.preferences.title'));
    expect(await SettingsPage.securityHeader.getText()).to.equal(await t('browserView.settings.security.title'));
    expect(await SettingsPage.supportHeader.getText()).to.equal(await t('browserView.settings.help.support.title'));
    expect(await SettingsPage.legalHeader.getText()).to.equal(await t('browserView.settings.legal.title'));
    expect(await SettingsPage.removeWalletHeader.getText()).to.equal(
      await t('browserView.settings.wallet.general.removeWallet')
    );
  }

  async assertSeeRemoveWalletSection() {
    await SettingsPage.removeWalletHeader.waitForDisplayed();
    expect(await SettingsPage.removeWalletHeader.getText()).to.equal(
      await t('browserView.settings.wallet.general.removeWallet')
    );
    await SettingsPage.removeWalletDescription.waitForDisplayed();
    expect(await SettingsPage.removeWalletDescription.getText()).to.equal(
      await t('browserView.settings.wallet.general.removeWalletDescription')
    );
    await this.assertSeeRemoveWalletButton();
  }

  async assertSeeRemoveWalletButton() {
    await SettingsPage.removeWalletButton.waitForDisplayed();
    expect(await SettingsPage.removeWalletButton.getText()).to.equal(
      await t('browserView.settings.wallet.general.removeAction')
    );
  }

  async assertSeeAnalyticsSection() {
    await SettingsPage.analyticsLink.title.waitForDisplayed();
    expect(await SettingsPage.analyticsLink.getTitleText()).to.equal(
      await t('browserView.settings.security.analytics.title')
    );
    await SettingsPage.analyticsLink.description.waitForDisplayed();
    expect(await SettingsPage.analyticsLink.getDescriptionText()).to.equal(
      await t('browserView.settings.security.analytics.description')
    );
    await SettingsPage.analyticsSwitch.waitForDisplayed();
  }

  async assertSeeBetaProgramSection(switchChecked: boolean) {
    await SettingsPage.betaProgramLink.title.waitForDisplayed();
    expect(await SettingsPage.betaProgramLink.getTitleText()).to.equal(
      await t('browserView.settings.preferences.betaProgram.title')
    );
    await SettingsPage.betaProgramLink.description.waitForDisplayed();
    expect(await SettingsPage.betaProgramLink.getDescriptionText()).to.equal(
      await t('browserView.settings.preferences.betaProgram.description')
    );
    await SettingsPage.betaProgramSwitch.waitForDisplayed();
    expect(await SettingsPage.betaProgramSwitch.getAttribute('aria-checked')).to.equal(String(switchChecked));
  }

  async assertSeeDebuggingSection(switchChecked: boolean) {
    await SettingsPage.debuggingLink.title.waitForDisplayed();
    expect(await SettingsPage.debuggingLink.getTitleText()).to.equal(
      await t('browserView.settings.preferences.debugging.title')
    );
    await SettingsPage.debuggingLink.description.waitForDisplayed();
    expect(await SettingsPage.debuggingLink.getDescriptionText()).to.equal(
      await t('browserView.settings.preferences.debugging.description')
    );
    await SettingsPage.debuggingSwitch.waitForDisplayed();
    expect(await SettingsPage.betaProgramSwitch.getAttribute('aria-checked')).to.equal(String(switchChecked));
  }

  async assertShowRecoveryPhraseIsDisplayedUnderSecuritySection() {
    await SettingsPage.securitySettingsElements[0].waitForClickable();
    // eslint-disable-next-line no-undef
    const firstElementInSecuritySection = (await SettingsPage.securitySettingsElements[0]) as WebdriverIO.Element;
    expect(await firstElementInSecuritySection?.getText()).to.contain(
      await t('browserView.settings.security.showPassphrase.title')
    );
  }

  async assertSeeCurrentNetworkName(expectedNetwork: string) {
    await browser.waitUntil(async () => (await SettingsPage.networkLink.addon.getText()) === expectedNetwork, {
      timeout: 3000,
      interval: 1000,
      timeoutMsg: 'failed while waiting for network change'
    });
  }

  async assertSeeAboutLaceComponent() {
    await SettingsPage.aboutLaceWidget.title.waitForClickable();
    expect(await SettingsPage.aboutLaceWidget.title.getText()).to.equal(
      (await t('browserView.settings.wallet.about.content.title')).replace('{{name}}', 'Lace')
    );
    await SettingsPage.aboutLaceWidget.networkLabel.waitForDisplayed();
    expect(await SettingsPage.aboutLaceWidget.networkLabel.getText()).to.equal(
      await t('browserView.settings.wallet.about.content.network')
    );
    await SettingsPage.aboutLaceWidget.networkValue.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.versionLabel.waitForDisplayed();
    expect(await SettingsPage.aboutLaceWidget.versionLabel.getText()).to.equal(
      await t('browserView.settings.wallet.about.content.currentVersion')
    );
    await SettingsPage.aboutLaceWidget.versionValue.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.commitLabel.waitForDisplayed();
    expect(await SettingsPage.aboutLaceWidget.commitLabel.getText()).to.equal(
      await t('browserView.settings.wallet.about.content.commit')
    );
    await SettingsPage.aboutLaceWidget.commitValue.waitForDisplayed();

    await SettingsPage.aboutLaceWidget.website.element.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.website.icon.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.twitter.element.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.twitter.icon.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.youtube.element.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.youtube.icon.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.discord.element.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.discord.icon.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.github.element.waitForDisplayed();
    await SettingsPage.aboutLaceWidget.github.icon.waitForDisplayed();
  }

  async assertSeeNetworkInAboutComponent(expectedNetwork: string) {
    await browser.waitUntil(
      async () => (await SettingsPage.aboutLaceWidget.networkValue.getText()) === expectedNetwork,
      {
        timeout: 3000,
        interval: 1000,
        timeoutMsg: 'failed while waiting for network change'
      }
    );
  }

  async assertCustomSubmitApiEnabled(isEnabled: boolean) {
    const expectedValue = isEnabled
      ? await t('browserView.settings.wallet.customSubmitApi.enabled')
      : await t('browserView.settings.wallet.customSubmitApi.disabled');

    await browser.waitUntil(async () => (await SettingsPage.customSubmitAPILink.addon.getText()) === expectedValue, {
      timeout: 3000,
      interval: 1000,
      timeoutMsg: `Failed while waiting for Custom Submit API with "${expectedValue}" state`
    });
  }
}

export default new SettingsPageAssert();
