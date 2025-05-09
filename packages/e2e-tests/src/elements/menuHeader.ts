/* eslint-disable no-undef */
import { ChainablePromiseElement } from 'webdriverio';

export class MenuHeader {
  private AVATAR_ON_BUTTON =
    '[data-testid="profile-dropdown-trigger-menu"] [data-testid="profile-dropdown-trigger-menu-icon"]';
  private WALLET_NAME_ON_BUTTON = '//span[@data-testid="profile-dropdown-trigger-menu-title"]';
  private ACCOUNT_NAME_ON_BUTTON = '//span[@data-testid="profile-dropdown-trigger-menu-subtitle"]';
  private CHEVRON_DOWN = '[data-testid="profile-dropdown-trigger-menu-chevron-down"]';
  private CHEVRON_UP = '[data-testid="profile-dropdown-trigger-menu-chevron-up"]';
  private CONTAINER = '//ul[@data-testid="header-menu"]';
  private LOGO_SELECTOR = '//*[@data-testid="header-logo"]';
  private NETWORK_PILL = '[data-testid="network-pill"]';
  private OFFLINE_NETWORK_PILL = '[data-testid="network-offline-indicator"]';
  private MENU_BUTTON = '//button[@data-testid="profile-dropdown-trigger-menu"]';
  private MENU_ADDRESS_BOOK_BUTTON = '//li[@data-testid="header-menu-address-book"]';
  private MENU_ADD_NEW_WALLET_BUTTON = '[data-testid="header-menu-new-wallet"]';
  private MENU_ADD_BITCOIN_WALLET_BUTTON = '[data-testid="header-menu-add-bitcoin-wallet"]';
  private MENU_ADD_SHARED_WALLET_BUTTON = '[data-testid="header-menu-add-shared-wallet"]';
  private MENU_SETTINGS_BUTTON = '//li[@data-testid="header-menu-settings"]';
  private MENU_SIGN_MESSAGE_BUTTON = '//li[@data-testid="header-menu-sign-message"]';
  private MENU_LOCK_BUTTON = '//li[@data-testid="header-menu-lock"]';
  private MENU_WALLET_OPTION_ITEM = '//button[@data-testid="wallet-option-item"]';
  private MENU_WALLET_OPTION_NAME = '//span[@data-testid="wallet-option-title"]';
  private MENU_WALLET_OPTION_ACCOUNT = '//span[@data-testid="wallet-option-subtitle"]';
  private MENU_WALLET_STATUS = '//p[@data-testid="header-wallet-status"]';
  private EXPAND_BUTTON = '[data-testid="expand-button"]';
  private EXPAND_BUTTON_TOOLTIP = '.ant-tooltip-inner';
  private MENU_NAMI_MODE_ITEM = '.ant-dropdown-menu [data-testid="header-menu-nami-mode-switcher"]';
  private MENU_NAMI_MODE_SWITCH = '.ant-dropdown-menu [data-testid="settings-nami-mode-switch"]';
  private MENU_THEME_LABEL = '.ant-dropdown-menu [data-testid="header-menu-theme-switcher"]';
  private MENU_THEME_SWITCHER = '.ant-dropdown-menu [data-testid="header-menu-theme-switcher"] button';
  private MENU_NETWORK_LABEL = '[data-testid="header-menu-network-choice-label"]';
  private MENU_NETWORK_VALUE = '[data-testid="header-menu-network-choice-value"]';
  private RIGHT_SIDE_PANEL_BUTTON = '//button[@data-testid="side-panel-handler"]';
  private readonly RECEIVE_BUTTON = 'aside [data-testid="receive-button"]';
  private readonly SEND_BUTTON = 'aside [data-testid="send-button"]';
  private readonly CO_SIGN_BUTTON = '[data-testid="co-sign-button"]';

  get avatarOnButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.AVATAR_ON_BUTTON);
  }

  get walletNameOnButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.WALLET_NAME_ON_BUTTON);
  }

  get accountNameOnButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.ACCOUNT_NAME_ON_BUTTON);
  }

  get expandButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EXPAND_BUTTON);
  }

  get expandButtonTooltip(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.EXPAND_BUTTON_TOOLTIP);
  }

  get logo(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.LOGO_SELECTOR);
  }

  get networkPill(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.NETWORK_PILL);
  }

  get offlineNetworkPill(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.OFFLINE_NETWORK_PILL);
  }

  get receiveButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RECEIVE_BUTTON);
  }

  get sendButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.SEND_BUTTON);
  }

  get coSignButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CO_SIGN_BUTTON);
  }

  get menuButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_BUTTON);
  }

  get menuContainer(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CONTAINER);
  }

  get menuUserDetailsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_WALLET_OPTION_ITEM);
  }

  get menuWalletName(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_WALLET_OPTION_NAME);
  }

  get menuWalletAccount(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_WALLET_OPTION_ACCOUNT);
  }

  get menuAddressBookButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_ADDRESS_BOOK_BUTTON);
  }

  get menuAddNewWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_ADD_NEW_WALLET_BUTTON);
  }

  get menuAddBitcoinWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_ADD_BITCOIN_WALLET_BUTTON);
  }

  get menuAddSharedWalletButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_ADD_SHARED_WALLET_BUTTON);
  }

  get menuSettingsButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_SETTINGS_BUTTON);
  }

  get menuSignMessageButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_SIGN_MESSAGE_BUTTON);
  }

  get menuLockButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_LOCK_BUTTON);
  }

  get menuWalletStatus(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_WALLET_STATUS);
  }

  get menuNamiModeItem(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_NAMI_MODE_ITEM);
  }

  get menuNamiModeSwitch(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_NAMI_MODE_SWITCH);
  }

  get menuThemeSwitcher(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_THEME_SWITCHER);
  }

  get menuThemeLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_THEME_LABEL);
  }

  get menuNetworkLabel(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_NETWORK_LABEL);
  }

  get menuNetworkValue(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.MENU_NETWORK_VALUE);
  }

  get chevronDown(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CHEVRON_DOWN);
  }

  get chevronUp(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.CHEVRON_UP);
  }

  get rightSidePanelButton(): ChainablePromiseElement<WebdriverIO.Element> {
    return $(this.RIGHT_SIDE_PANEL_BUTTON);
  }

  async clickOnExpandButton(): Promise<void> {
    await this.expandButton.click();
  }

  async hoverOverExpandButton(): Promise<void> {
    await this.expandButton.moveTo();
  }

  async openUserMenu(): Promise<void> {
    await this.clickMenuButton();
    await this.menuContainer.waitForStable();
  }

  async closeUserMenu(): Promise<void> {
    const isMenuOpened = await this.menuContainer.isDisplayed();
    if (isMenuOpened) {
      await this.clickMenuButton();
    }
  }

  async clickOnAddNewWalletOption(): Promise<void> {
    await this.menuAddNewWalletButton.waitForClickable();
    await this.menuAddNewWalletButton.click();
  }

  async clickOnAddBitcoinWalletOption(): Promise<void> {
    await this.menuAddBitcoinWalletButton.waitForClickable();
    await this.menuAddBitcoinWalletButton.click();
  }

  async clickOnAddSharedWalletOption(): Promise<void> {
    await this.menuAddSharedWalletButton.waitForClickable();
    await this.menuAddSharedWalletButton.click();
  }

  async clickMenuButton(): Promise<void> {
    await this.menuButton.waitForClickable({ timeout: 15_000 });
    await this.menuButton.click();
  }

  async openAddressBook(): Promise<void> {
    await this.openUserMenu();
    await this.menuAddressBookButton.click();
  }

  async clickLogo(): Promise<void> {
    await this.logo.click();
  }

  async openSettings(): Promise<void> {
    await this.openUserMenu();
    await this.menuSettingsButton.waitForClickable();
    await this.menuSettingsButton.click();
  }

  async clickUserDetailsButton(): Promise<void> {
    await this.menuUserDetailsButton.click();
  }

  async clickNetworkOption(): Promise<void> {
    await this.menuNetworkLabel.waitForStable();
    await this.menuNetworkLabel.click();
  }

  async clickSettingsOption(): Promise<void> {
    await this.menuSettingsButton.waitForStable();
    await this.menuSettingsButton.click();
  }

  async clickSignMessageButton(): Promise<void> {
    await this.menuSignMessageButton.waitForClickable();
    await this.menuSignMessageButton.click();
  }

  async clickAddressBookOption(): Promise<void> {
    await this.menuAddressBookButton.click();
  }

  async clickLockWalletOption(): Promise<void> {
    await this.menuLockButton.scrollIntoView();
    await this.menuLockButton.click();
  }

  async lockWallet(): Promise<void> {
    await this.openUserMenu();
    await this.clickLockWalletOption();
  }

  async setExtensionTheme(mode: 'light' | 'dark'): Promise<void> {
    if (mode !== ((await this.menuThemeSwitcher.getAttribute('aria-checked')) === 'true' ? 'light' : 'dark')) {
      await this.menuThemeSwitcher.waitForClickable();
      await this.menuThemeSwitcher.click();
    }
  }

  async activateNamiMode(): Promise<void> {
    await this.menuNamiModeSwitch.waitForClickable();
    await this.menuNamiModeSwitch.click();
  }

  async clickRightSidePanelButton(): Promise<void> {
    await this.rightSidePanelButton.click();
  }
}

export default new MenuHeader();
