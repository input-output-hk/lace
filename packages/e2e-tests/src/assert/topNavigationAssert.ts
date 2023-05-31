import MenuHeader from '../elements/menuHeader';
import MenuHeaderNetwork from '../elements/menuHeaderNetwork';
import { t } from '../utils/translationService';
import { expect } from 'chai';
import { ParsedCSSValue } from 'webdriverio';
import extensionUtils from '../utils/utils';

class TopNavigationAssert {
  private readonly CSS_COLOR = 'color';
  private readonly CSS_BACKGROUND_COLOR = 'background-color';

  async assertSeeReceiveButton() {
    await MenuHeader.receiveButton.waitForDisplayed();
    expect(await MenuHeader.receiveButton.getText()).to.equal(await t('core.sendReceive.receive'));
  }

  async assertSeeSendButton() {
    await MenuHeader.sendButton.waitForDisplayed();
    expect(await MenuHeader.sendButton.getText()).to.equal(await t('core.sendReceive.send'));
  }

  async assertLogoPresent() {
    await MenuHeader.logo.waitForDisplayed();
  }

  async assertSeeMenuButton() {
    await MenuHeader.menuButton.waitForDisplayed();
    await this.assertSeeAvatarWithNameInitialOnMenuButton();
  }

  async assertSeeAvatarWithNameInitialOnMenuButton() {
    const expectedInitial = await extensionUtils.getWalletInitialFromLocalStorage();
    await MenuHeader.avatarOnButton.waitForDisplayed();
    expect(await MenuHeader.avatarOnButton.getText()).to.equal(expectedInitial);
  }

  async assertSeeAvatarWithWalletInitialOnMenu() {
    const expectedInitial = await extensionUtils.getWalletInitialFromLocalStorage();
    await MenuHeader.avatarOnMenu.waitForDisplayed();
    expect(await MenuHeader.avatarOnMenu.getText()).to.equal(expectedInitial);
  }

  async assertDropdownVisible() {
    await this.assertSeeAvatarWithWalletInitialOnMenu();
    await MenuHeader.menuWalletAddress.waitForDisplayed();
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
    await MenuHeader.menuNetworkLabel.waitForDisplayed();
    expect(await MenuHeader.menuNetworkLabel.getText()).to.equal(await t('browserView.topNavigationBar.links.network'));
    expect(await MenuHeader.menuNetworkValue.getText()).to.be.oneOf(['Mainnet', 'Preprod', 'Preview']);
    await MenuHeader.menuLockButton.waitForDisplayed();
    expect(await MenuHeader.menuLockButton.getText()).to.equal(
      await t('browserView.topNavigationBar.links.lockWallet')
    );
  }

  async assertSeeWalletStatusComponent() {
    await MenuHeader.menuUserDetailsButton.waitForDisplayed();
    const status = await MenuHeader.menuWalletStatus.getText();
    const synced = await t('browserView.topNavigationBar.walletStatus.walletSynced');
    const notSynced = await t('browserView.topNavigationBar.walletStatus.notSyncedToTheBlockchain');
    const syncing = await t('browserView.topNavigationBar.walletStatus.walletSyncing');
    expect(status).to.be.oneOf([synced, notSynced, syncing]);
  }

  async assertSyncStatusValid(expectedStatus: string) {
    expectedStatus = (await t(expectedStatus)) ?? expectedStatus;
    await MenuHeader.menuUserDetailsButton.waitForDisplayed();
    await browser.waitUntil(async () => (await MenuHeader.menuWalletStatus.getText()) === expectedStatus, {
      timeout: 80_000,
      interval: 500,
      timeoutMsg: `expected sync status: ${expectedStatus} was not displayed`
    });
  }

  async assertWalletIsInSyncedStatus() {
    await MenuHeader.menuButton.waitForDisplayed();
    await MenuHeader.menuButton.click();
    await this.assertSeeWalletStatusComponent();
    await this.assertSyncStatusValid('browserView.topNavigationBar.walletStatus.walletSynced');
    await MenuHeader.menuButton.click();
  }

  async assertNetworkIdVisible(expectedNetwork: 'Mainnet' | 'Preprod' | 'Preview') {
    const networkPill = await MenuHeader.networkPill;
    await networkPill.waitForDisplayed();
    expect(await networkPill.getText()).to.equal(expectedNetwork);
  }

  async assertNetworkIdNotVisible() {
    await MenuHeader.networkPill.waitForDisplayed({ reverse: true });
  }

  async assertNetworkPillOffline() {
    const networkPill = await MenuHeader.offlineNetworkPill;
    await networkPill.waitForDisplayed();
    expect(await networkPill.getText()).to.equal(await t('general.networks.offline'));
  }

  async assertNetworkIdNextToLogo() {
    const logo = MenuHeader.logo;
    const logoSibling = await logo.$('//following-sibling::div');
    expect(await logoSibling.getAttribute('data-testid')).to.equal('network-pill');
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
    expect(bgColor).to.equal(mode === 'light' ? '#efefef' : '#333333');
  }

  async assertMenuButtonFontColorMode(mode: string) {
    const fontColor = (await MenuHeader.menuButton.getCSSProperty(this.CSS_COLOR)).parsed.hex;
    expect(fontColor).to.equal(mode === 'light' ? '#3d3b39' : '#ffffff');
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

  async assertSeeExpandButton(withText = false) {
    const expandButton = MenuHeader.expandButton;
    await expandButton.waitForDisplayed();
    const expectedText = withText ? await t('expandPopup') : '';
    await expect(await expandButton.getText()).to.equal(expectedText);
  }

  async assertSeeCurrentNetworkInUserMenu(networkName = 'Preprod') {
    await MenuHeader.menuNetworkLabel.waitForDisplayed();
    await expect(await MenuHeader.menuNetworkLabel.getText()).to.equal(
      await t('browserView.topNavigationBar.links.network')
    );

    await MenuHeader.menuNetworkValue.waitForDisplayed();
    const expectedNetwork = extensionUtils.isMainnet() ? 'Mainnet' : networkName;
    await expect(await MenuHeader.menuNetworkValue.getText()).to.equal(expectedNetwork);
  }

  async assertSeeNetworkSubMenu() {
    await MenuHeaderNetwork.container.waitForDisplayed();
    await MenuHeaderNetwork.backButton.waitForDisplayed();
    await MenuHeaderNetwork.title.waitForDisplayed();
    await expect(await MenuHeaderNetwork.title.getText()).to.equal(
      await t('browserView.settings.wallet.network.title')
    );
    await MenuHeaderNetwork.description.waitForDisplayed();
    await expect(await MenuHeaderNetwork.description.getText()).to.equal(
      await t('browserView.settings.wallet.network.drawerDescription')
    );
    await MenuHeaderNetwork.mainnetRadioButton.waitForDisplayed();
    await MenuHeaderNetwork.preprodRadioButton.waitForDisplayed();
    await MenuHeaderNetwork.previewRadioButton.waitForDisplayed();
  }

  async assertSeeWalletName(expectedWalletName: string) {
    await MenuHeader.menuWalletName.waitForDisplayed();
    await expect(await MenuHeader.menuWalletName.getText()).to.equal(expectedWalletName);
  }
}

export default new TopNavigationAssert();
