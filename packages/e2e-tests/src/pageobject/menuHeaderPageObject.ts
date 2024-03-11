import MenuHeader from '../elements/menuHeader';

class MenuHeaderPageObject {
  async clickMenuButton() {
    await MenuHeader.menuButton.waitForClickable({ timeout: 16_000 });
    await MenuHeader.menuButton.click();
  }

  async clickUserDetailsButton() {
    await MenuHeader.menuUserDetailsButton.click();
  }

  async clickLogo() {
    await MenuHeader.logo.click();
  }

  async openMenu() {
    await this.clickMenuButton();
    await MenuHeader.menuContainer.waitForStable();
  }

  async closeMenu() {
    const isMenuOpened = await MenuHeader.menuContainer.isDisplayed();
    if (isMenuOpened) {
      await this.clickMenuButton();
    }
  }

  async openAddressBook() {
    await this.openMenu();
    await MenuHeader.menuAddressBookButton.click();
  }

  async openSettings() {
    await this.openMenu();
    await MenuHeader.menuSettingsButton.click();
  }

  async clickLockWallet() {
    await this.openMenu();
    await MenuHeader.menuLockButton.click();
  }

  async clickNetworkOption() {
    await MenuHeader.menuNetworkLabel.click();
  }

  async clickSettingsOption() {
    await MenuHeader.menuSettingsButton.click();
  }

  async clickAddressBookOption() {
    await MenuHeader.menuAddressBookButton.click();
  }

  async clickLockWalletOption() {
    await MenuHeader.menuLockButton.click();
  }

  async setExtensionTheme(mode: 'light' | 'dark') {
    if (mode !== ((await MenuHeader.menuThemeSwitcher.getAttribute('aria-checked')) === 'true' ? 'light' : 'dark')) {
      await MenuHeader.menuThemeSwitcher.waitForClickable();
      await MenuHeader.menuThemeSwitcher.click();
    }
  }

  async clickRightSidePanelButton() {
    await MenuHeader.rightSidePanelButton.click();
  }
}

export default new MenuHeaderPageObject();
