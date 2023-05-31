import { Then, When } from '@wdio/cucumber-framework';
import topNavigationAssert from '../assert/topNavigationAssert';
import menuHeaderPageObject from '../pageobject/menuHeaderPageObject';
import menuHeaderNetwork from '../elements/menuHeaderNetwork';
import MenuHeader from '../elements/menuHeader';

When(/I click the menu button/, async () => {
  await menuHeaderPageObject.clickMenuButton();
});

When(/I click on the user details button/, async () => {
  await menuHeaderPageObject.clickUserDetailsButton();
});

When(/I click on the logo icon/, async () => {
  await menuHeaderPageObject.clickLogo();
});

Then(/the dropdown menu is visible/, async () => {
  await topNavigationAssert.assertDropdownVisible();
});

Then(/all buttons and images in the top navigation are present/, async () => {
  await topNavigationAssert.assertLogoPresent();
  await topNavigationAssert.assertSeeReceiveButton();
  await topNavigationAssert.assertSeeSendButton();
  await topNavigationAssert.assertSeeMenuButton();
});

Then(/^wallet sync status component is visible$/, async () => {
  await topNavigationAssert.assertSeeWalletStatusComponent();
});

Then(/sync status displays "([^"]*)" state/, async (walletState: string) => {
  await topNavigationAssert.assertSyncStatusValid(walletState);
});

Then(
  /^I see network id: "(Mainnet|Preprod|Preview)" next to Lace logo$/,
  async (expectedNetwork: 'Mainnet' | 'Preprod' | 'Preview') => {
    await topNavigationAssert.assertNetworkIdVisible(expectedNetwork);
    await topNavigationAssert.assertNetworkIdNextToLogo();
  }
);

Then(/^I don't see network id next to Lace logo for: "Mainnet"$/, async () => {
  await topNavigationAssert.assertNetworkIdNotVisible();
});

Then(
  /^I see network id next to Lace logo for: "(Preprod|Preview)"$/,
  async (expectedNetwork: 'Preprod' | 'Preview') => {
    await topNavigationAssert.assertNetworkIdVisible(expectedNetwork);
    await topNavigationAssert.assertNetworkIdNextToLogo();
  }
);

Then(/^I see network pill indicates that status is offline next to Lace logo$/, async () => {
  await topNavigationAssert.assertNetworkPillOffline();
  await topNavigationAssert.assertNetworkIdNextToLogo();
});

Then(/^I can see application in (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await topNavigationAssert.assertThemeTitle(mode);
  await topNavigationAssert.assertFontColor(mode);
  await topNavigationAssert.assertBackgroundColor(mode);
});

Then(/^I can see the user menu button in (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await browser.pause(1000);
  await topNavigationAssert.assertMenuButtonFontColorMode(mode);
  await topNavigationAssert.assertMenuButtonBackgroundColorMode(mode);
});

Then(/^I can see the user menu in (light|dark) mode$/, async (mode: 'light' | 'dark') => {
  await browser.pause(1000);
  await topNavigationAssert.assertFontColor(mode);
  await topNavigationAssert.assertMenuBackgroundColorMode(mode);
});

Then(/^Menu button is displayed$/, async () => {
  await topNavigationAssert.assertSeeMenuButton();
});

Then(/^chevron icon is changed to (up|down)$/, async (chevronDirection: 'up' | 'down') => {
  await topNavigationAssert.assertChevronDirection(chevronDirection);
});

Then(/^I see current network in user menu$/, async () => {
  await topNavigationAssert.assertSeeCurrentNetworkInUserMenu();
});

When(/^I click on the network option$/, async () => {
  await menuHeaderPageObject.clickNetworkOption();
});

When(/^I click on the settings option$/, async () => {
  await menuHeaderPageObject.clickSettingsOption();
});

When(/^I click on then network sub-menu back button$/, async () => {
  await menuHeaderNetwork.backButton.click();
});

Then(/^I see network sub-menu$/, async () => {
  await topNavigationAssert.assertSeeNetworkSubMenu();
});

Then(/^header menu displays "([^"]*)" as a wallet name$/, async (walletName) => {
  await topNavigationAssert.assertSeeWalletName(walletName);
});

When(/^I close header menu$/, async () => {
  await menuHeaderPageObject.closeMenu();
});

When(/^I click "(Receive|Send)" button on page header$/, async (button: 'Receive' | 'Send') => {
  switch (button) {
    case 'Receive':
      await MenuHeader.receiveButton.waitForDisplayed();
      await MenuHeader.receiveButton.click();
      break;
    case 'Send':
      await MenuHeader.sendButton.waitForDisplayed();
      await MenuHeader.sendButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});
