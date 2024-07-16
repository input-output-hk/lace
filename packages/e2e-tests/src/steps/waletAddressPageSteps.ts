import { Then, When } from '@wdio/cucumber-framework';
import { getTestWallet } from '../support/walletConfiguration';
import walletAddressPageAssert from '../assert/walletAddressPageAssert';
import walletAddressPage from '../elements/walletAddressPage';
import MenuHeader from '../elements/menuHeader';

When(/^I see handles listed on the "Receive" screen$/, async () => {
  await walletAddressPageAssert.assertSeeAdaHandleAddressCard();
});

Then(
  /^I see "Wallet Address" page in (extended|popup) mode for wallet "([^"]*)"$/,
  async (mode: 'extended' | 'popup', testWalletName: string) => {
    await walletAddressPageAssert.assertSeeWalletAddressPage(mode);
    await walletAddressPageAssert.assertSeeWalletNameAndAddress(getTestWallet(testWalletName), mode);
  }
);

When(/^I click "Copy" button on "Receive" page for default wallet address$/, async () => {
  await browser.pause(500);
  await walletAddressPage.addressCard.scrollIntoView();
  await walletAddressPage.addressCard.moveTo();
  await walletAddressPage.copyButton.click();
});

When(/^I click "Copy" button on "Receive" page for handle: "([^"]*)"$/, async (handleName: string) => {
  await walletAddressPage.clickCopyButtonForHandle(handleName);
});

When(/^I see address card for handle: "([^"]*)"$/, async (handleName: string) => {
  await walletAddressPageAssert.assertSeeAdaHandleAddressCardWithName(handleName, true);
});

When(
  /^I validate that handle: "([^"]*)" (is|is not) listed on the Receive screen$/,
  async (handleName: string, shouldBeListed: 'is' | 'is not') => {
    await MenuHeader.receiveButton.waitForClickable();
    await MenuHeader.receiveButton.click();
    await walletAddressPageAssert.assertSeeAdaHandleAddressCardWithName(handleName, shouldBeListed === 'is');
    await walletAddressPage.clickCloseDrawerButton();
  }
);

Then(/^The first ADA handle displayed on the list is the shortest$/, async () => {
  await walletAddressPageAssert.assertSeeTheShortestHandleFirst();
});

Then(/^I see ADA handle with custom image on the "Wallet Address" page$/, async () => {
  await walletAddressPageAssert.assertSeeAdaHandleCardWithCustomImage();
});
