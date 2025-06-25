import MenuHeader from '../elements/menuHeader';
import MenuHeaderNetwork from '../elements/menuHeaderNetwork';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import { ParsedCSSValue } from 'webdriverio';
import extensionUtils from '../utils/utils';
import { browser } from '@wdio/globals';
import WalletOption from '../elements/WalletOption';
import CrashScreen from '../elements/CrashScreen';
import { waitUntilHdWalletSynced } from '../utils/networkUtils';

class TopNavigationAssert {
  private readonly CSS_COLOR = 'color';
  private readonly CSS_BACKGROUND_COLOR = 'background-color';

  async assertSeeReceiveButton() {
    await MenuHeader.receiveButton.waitForDisplayed();
    expect(await MenuHeader.receiveButton.getText()).to.equal(await t('core.transactionCtas.receive'));
  }

  async assertSeeSendButton() {
    await MenuHeader.sendButton.waitForDisplayed();
    expect(await MenuHeader.sendButton.getText()).to.equal(await t('core.transactionCtas.send'));
  }

  async assertSeeCoSignButton() {
    await MenuHeader.coSignButton.waitForDisplayed();
    expect(await MenuHeader.coSignButton.getText()).to.equal(await t('core.transactionCtas.coSign'));
  }

  async assertLogoPresent() {
    await MenuHeader.logo.waitForDisplayed({ timeout: 180_000 });
  }

  async assertSeeMenuButton() {
    await MenuHeader.menuButton.waitForDisplayed();
    await MenuHeader.avatarOnButton.waitForDisplayed();
    await MenuHeader.walletNameOnButton.waitForDisplayed();
    await MenuHeader.accountNameOnButton.waitForDisplayed();
  }

  async assertSeeWalletNameOnMenuButton(expectedName: string): Promise<void> {
    await MenuHeader.walletNameOnButton.waitForDisplayed();
    expect(await MenuHeader.walletNameOnButton.getText()).to.equal(expectedName);
  }

  async assertSeeAccountNameOnMenuButton(expectedName: string): Promise<void> {
    await MenuHeader.accountNameOnButton.waitForDisplayed();
    expect(await MenuHeader.accountNameOnButton.getText()).to.equal(expectedName);
  }

  async assertSeeWalletOnUserMenu(index: number, expectedName: string): Promise<void> {
    const wallet = new WalletOption(index);
    await wallet.container.waitForDisplayed();
    await wallet.title.waitForDisplayed();
    expect(await wallet.title.getText()).to.equal(expectedName);
  }

  async assertSeeWalletAccountOnUserMenu(walletIndex: number, expectedName: string): Promise<void> {
    const wallet = new WalletOption(walletIndex);
    await wallet.container.waitForDisplayed();
    await wallet.subtitle.waitForDisplayed();
    expect(await wallet.subtitle.getText()).to.equal(expectedName);
  }

  async assertSeeEditOptionForWallet(index: number, shouldBeDisplayed: boolean): Promise<void> {
    const wallet = new WalletOption(index);
    await wallet.editButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
  }

  async assertWalletIsActive(index: number): Promise<void> {
    await new WalletOption(index).status.waitForDisplayed();
  }

  async assertDropdownVisible() {
    await MenuHeader.menuWalletAccount.waitForDisplayed();
    await MenuHeader.menuAddNewWalletButton.waitForDisplayed();
    expect(await MenuHeader.menuAddNewWalletButton.getText()).to.equal(
      await t('browserView.sideMenu.links.addNewWallet')
    );
    await MenuHeader.menuAddBitcoinWalletButton.waitForDisplayed({ reverse: extensionUtils.isMainnet() });
    await MenuHeader.menuAddSharedWalletButton.waitForDisplayed({ reverse: extensionUtils.isMainnet() });
    if (!extensionUtils.isMainnet()) {
      expect(await MenuHeader.menuAddBitcoinWalletButton.getText()).to.equal(
        await t('browserView.sideMenu.links.addBitcoinWallet')
      );
      expect(await MenuHeader.menuAddSharedWalletButton.getText()).to.equal(
        await t('browserView.sideMenu.links.addSharedWallet')
      );
    }
    await MenuHeader.menuAddressBookButton.waitForDisplayed();
    expect(await MenuHeader.menuAddressBookButton.getText()).to.equal(
      await t('browserView.sideMenu.links.addressBook')
    );
    await MenuHeader.menuSettingsButton.waitForDisplayed();
    expect(await MenuHeader.menuSettingsButton.getText()).to.equal(
      await t('browserView.topNavigationBar.links.settings')
    );
    await MenuHeader.menuThemeLabel.waitForDisplayed();
    expect(await MenuHeader.menuThemeLabel.getText()).to.be.oneOf([
      await t('browserView.sideMenu.mode.dark'),
      await t('browserView.sideMenu.mode.light')
    ]);
    await MenuHeader.menuNamiModeItem.waitForDisplayed();
    expect(await MenuHeader.menuNamiModeItem.getText()).to.equal(await t('browserView.settings.legacyMode.section'));
    await MenuHeader.menuNamiModeSwitch.waitForDisplayed();
    expect(await MenuHeader.menuNamiModeSwitch.getAttribute('aria-checked')).to.equal('false');
    await MenuHeader.menuNetworkLabel.waitForDisplayed();
    expect(await MenuHeader.menuNetworkLabel.getText()).to.equal(await t('browserView.topNavigationBar.links.network'));
    expect(await MenuHeader.menuNetworkValue.getText()).to.be.oneOf(['Mainnet', 'Preprod', 'Preview']);
    await MenuHeader.menuLockButton.waitForDisplayed();
    expect(await MenuHeader.menuLockButton.getText()).to.equal(
      await t('browserView.topNavigationBar.links.lockWallet')
    );
  }

  async assertSeeWalletStatusComponent() {
    await MenuHeader.menuUserDetailsButton.waitForDisplayed({ timeout: 15_000 });
    const status = await MenuHeader.menuWalletStatus.getText();
    const synced = await t('browserView.topNavigationBar.walletStatus.walletSynced');
    const notSynced = await t('browserView.topNavigationBar.walletStatus.notSyncedToTheBlockchain');
    const syncing = await t('browserView.topNavigationBar.walletStatus.walletSyncing');
    expect(status).to.be.oneOf([synced, notSynced, syncing]);
  }

  async assertSyncStatusValid(expectedStatus: string) {
    expectedStatus = (await t(expectedStatus)) ?? expectedStatus;
    await MenuHeader.menuUserDetailsButton.waitForDisplayed({ timeout: 15_000 });
    await browser.waitUntil(async () => (await MenuHeader.menuWalletStatus.getText()) === expectedStatus, {
      timeout: 180_000,
      interval: 500,
      timeoutMsg: `expected sync status: ${expectedStatus} was not displayed`
    });
  }

  async assertWalletIsInSyncedStatus() {
    if (await CrashScreen.reloadExtensionButton.isDisplayed()) {
      throw new Error('Crash screen occurred!');
    }
    await waitUntilHdWalletSynced();
    await this.assertLogoPresent();
    await MenuHeader.menuButton.waitForClickable({ timeout: 10_000 });
    await MenuHeader.menuButton.click();
    await this.assertSeeWalletStatusComponent();
    await this.assertSyncStatusValid('browserView.topNavigationBar.walletStatus.walletSynced');
    await MenuHeader.menuButton.click();
  }

  async assertNetworkPillVisible(expectedNetwork: 'Mainnet' | 'Preprod' | 'Preview') {
    const networkPill = await MenuHeader.networkPill;
    await networkPill.waitForDisplayed();
    expect(await networkPill.getText()).to.equal(expectedNetwork);
  }

  async assertNetworkPillNotVisible() {
    await MenuHeader.networkPill.waitForDisplayed({ reverse: true });
  }

  async assertNetworkPillOffline() {
    const networkPill = await MenuHeader.offlineNetworkPill;
    await networkPill.waitForDisplayed();
    expect(await networkPill.getText()).to.equal(await t('general.networks.offline'));
  }

  async assertThemeTitle(mode: string) {
    await MenuHeader.menuThemeLabel.waitForDisplayed();
    expect(await MenuHeader.menuThemeLabel.getText()).to.equal(mode === 'light' ? 'Light mode' : 'Dark mode');
  }

  async assertFontColor(mode: string) {
    expect(((await MenuHeader.menuThemeLabel.getCSSProperty(this.CSS_COLOR)) as ParsedCSSValue).parsed.hex).to.equal(
      mode === 'light' ? '#3d3b39' : '#ffffff'
    );
  }

  async assertBackgroundColor(mode: string) {
    expect(((await $('body').getCSSProperty(this.CSS_BACKGROUND_COLOR)) as ParsedCSSValue).parsed.hex).to.equal(
      mode === 'light' ? '#ffffff' : '#1e1e1e'
    );
  }

  async assertMenuButtonBackgroundColorMode(mode: string) {
    const bgColor = (await MenuHeader.menuButton.getCSSProperty(this.CSS_BACKGROUND_COLOR)).parsed.hex;
    const darkColors = ['#282828', '#000000'];
    const lightColors = ['#ffffff', '#f9f9f9'];
    expect(bgColor).to.be.oneOf(mode === 'light' ? lightColors : darkColors);
  }

  async assertMenuButtonFontColorMode(mode: string) {
    const fontColor = (await MenuHeader.menuButton.getCSSProperty(this.CSS_COLOR)).parsed.hex;
    expect(fontColor).to.equal(mode === 'light' ? '#6f7786' : '#a9a9a9');
  }

  async assertMenuBackgroundColorMode(mode: string) {
    const bgColor = (await MenuHeader.menuContainer.getCSSProperty(this.CSS_BACKGROUND_COLOR)).parsed.hex;
    expect(bgColor).to.equal(mode === 'light' ? '#ffffff' : '#252525');
  }

  async assertChevronDirection(chevronDirection: 'up' | 'down') {
    chevronDirection === 'up'
      ? await MenuHeader.chevronUp.waitForDisplayed()
      : await MenuHeader.chevronDown.waitForDisplayed();
  }

  async assertSeeExpandButton(withTooltip = false) {
    await MenuHeader.expandButton.waitForDisplayed();
    if (withTooltip) {
      const expandButtonTooltip = MenuHeader.expandButtonTooltip;
      await expandButtonTooltip.waitForDisplayed();
      expect(await expandButtonTooltip.getText()).to.equal(await t('expandPopup'));
    }
  }

  async assertSeeCurrentNetworkInUserMenu(networkName = 'Preprod') {
    await MenuHeader.menuNetworkLabel.waitForDisplayed();
    expect(await MenuHeader.menuNetworkLabel.getText()).to.equal(await t('browserView.topNavigationBar.links.network'));

    await MenuHeader.menuNetworkValue.waitForDisplayed();
    const expectedNetwork = extensionUtils.isMainnet() ? 'Mainnet' : networkName;
    expect(await MenuHeader.menuNetworkValue.getText()).to.equal(expectedNetwork);
  }

  async assertSeeNetworkSubMenu() {
    await MenuHeaderNetwork.container.waitForDisplayed();
    await MenuHeaderNetwork.backButton.waitForDisplayed();
    await MenuHeaderNetwork.title.waitForDisplayed();
    expect(await MenuHeaderNetwork.title.getText()).to.equal(await t('browserView.settings.wallet.network.title'));
    await MenuHeaderNetwork.description.waitForDisplayed();
    expect(await MenuHeaderNetwork.description.getText()).to.equal(
      await t('browserView.settings.wallet.network.drawerDescription')
    );
    await MenuHeaderNetwork.mainnetRadioButton.waitForDisplayed();
    await MenuHeaderNetwork.preprodRadioButton.waitForDisplayed();
    await MenuHeaderNetwork.previewRadioButton.waitForDisplayed();
  }

  async assertSeeWalletName(expectedWalletName: string) {
    await MenuHeader.menuWalletName.waitForStable();
    expect(await MenuHeader.menuWalletName.getText()).to.equal(expectedWalletName);
  }

  async assertSeeCustomAvatar(expectedImageSrc: string) {
    await MenuHeader.avatarOnButton.waitForDisplayed();
    expect(await MenuHeader.avatarOnButton.getAttribute('src')).to.equal(expectedImageSrc);
  }

  async assertSeeRightSidePanelButton(shouldBeVisible: boolean) {
    await MenuHeader.rightSidePanelButton.waitForDisplayed({ reverse: !shouldBeVisible });
  }

  assertSeeExpandedIcon = async (shouldSee: boolean) => {
    await MenuHeader.logo.waitForDisplayed({ reverse: !shouldSee });
  };

  async assertDoNotSeeNamiModeSwitch() {
    await MenuHeader.menuNamiModeSwitch.waitForDisplayed({ reverse: true });
  }

  async assertSeeAddSharedWalletOption(shouldBeDisplayed: boolean) {
    await MenuHeader.menuAddSharedWalletButton.waitForDisplayed({ reverse: !shouldBeDisplayed });
  }
}

export default new TopNavigationAssert();
