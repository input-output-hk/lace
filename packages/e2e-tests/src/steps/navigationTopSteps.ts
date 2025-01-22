import { Then, When } from '@wdio/cucumber-framework';
import topNavigationAssert from '../assert/topNavigationAssert';
import menuHeaderNetwork from '../elements/menuHeaderNetwork';
import MenuHeader from '../elements/menuHeader';
import { browser } from '@wdio/globals';
import nftDetails from '../elements/NFTs/nftDetails';

When(/^I click the menu button$/, async () => {
  await MenuHeader.clickMenuButton();
});

When(/^I click on the user details button$/, async () => {
  await MenuHeader.clickUserDetailsButton();
});

When(/^I click on the logo icon$/, async () => {
  await MenuHeader.clickLogo();
});

Then(/^the user menu is displayed$/, async () => {
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
  /^I (see|do not see) network id: "(Mainnet|Preprod|Preview)"$/,
  async (shouldSee: 'see' | 'do not see', expectedNetwork: 'Mainnet' | 'Preprod' | 'Preview') => {
    await (shouldSee === 'see'
      ? topNavigationAssert.assertNetworkPillVisible(expectedNetwork)
      : topNavigationAssert.assertNetworkPillNotVisible());
  }
);

Then(/^I see network id with status: offline$/, async () => {
  await topNavigationAssert.assertNetworkPillOffline();
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

Then(/^"([^"]*)" is displayed as a wallet name on the menu button$/, async (expectedWalletName: string) => {
  await topNavigationAssert.assertSeeWalletNameOnMenuButton(expectedWalletName);
});

Then(/^chevron icon is changed to (up|down)$/, async (chevronDirection: 'up' | 'down') => {
  await topNavigationAssert.assertChevronDirection(chevronDirection);
});

Then(/^I see current network in user menu$/, async () => {
  await topNavigationAssert.assertSeeCurrentNetworkInUserMenu();
});

When(/^I click on the network option$/, async () => {
  await MenuHeader.clickNetworkOption();
});

When(/^I click on the settings option$/, async () => {
  await MenuHeader.clickSettingsOption();
});

When(/^I click on the "Sign message" option$/, async () => {
  await MenuHeader.clickSignMessageButton();
});

When(/^I click on the Lock Wallet option$/, async () => {
  await MenuHeader.clickLockWalletOption();
});

When(/^I click on the Address Book option$/, async () => {
  await MenuHeader.clickAddressBookOption();
});

When(/^I click on "Add new wallet" option$/, async () => {
  await MenuHeader.clickOnAddNewWalletOption();
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

Then(/^the NFT is set as a wallet profile avatar$/, async () => {
  const savedNftDetails = await nftDetails.loadNFTDetails();
  await topNavigationAssert.assertSeeCustomAvatar(savedNftDetails.mediaUrl);
});

When(/^I close header menu$/, async () => {
  await MenuHeader.closeUserMenu();
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

Then(/^I (see|do not see) a button to open the right side panel$/, async (shouldSee: 'see' | 'do not see') => {
  await topNavigationAssert.assertSeeRightSidePanelButton(shouldSee === 'see');
});

When(/^I click on right side panel icon$/, async () => {
  await MenuHeader.clickRightSidePanelButton();
});
