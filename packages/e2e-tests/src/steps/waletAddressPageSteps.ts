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

Then(
  /^I see "Wallet Address" page in (extended|popup) mode for account: (\d+) and wallet "([^"]*)"$/,
  async (mode: 'extended' | 'popup', accountNumber: number, testWalletName: string) => {
    await walletAddressPageAssert.assertSeeWalletAddressPage(mode);
    await walletAddressPageAssert.assertSeeWalletNameAccountAndAddress(
      getTestWallet(testWalletName),
      accountNumber,
      mode
    );
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

Then(
  /^I see "Wallet Address" "Advanced mode" toggle in (checked|unchecked) state$/,
  async (toggleState: 'checked' | 'unchecked') => {
    await walletAddressPageAssert.assertSeeAdvancedModeToggleState(toggleState);
  }
);

Then(/^I click "Wallet Address" "Advanced mode" toggle$/, async () => {
  await walletAddressPage.clickAdvancedModeToggle();
});

Then(/^I see Main address item in "Advanced mode"$/, async () => {
  await walletAddressPageAssert.assertSeeMainAddressCardInAdvancedMode('TestAutomationWallet');
});

Then(/^I see "Additional addresses" divider in "Advanced mode"$/, async () => {
  await walletAddressPageAssert.assertSeeAdditionalAddressesDivider();
});

Then(/^I see "Additional addresses" cards in "Advanced mode"$/, async () => {
  const testAutomationWalletAdditionalAddresses = [
    'addr_test1qp9u2f6e2ss4knzs04mk790mg7r36dw6n60tpy45n5zt9yezart77cuqpsvyw5555azd3e57fjcsfrx5e5e9xmgcmf0slx7s84',
    'addr_test1qp9u2f6e2ss4knzs04mk790mg7r36dw6n60tpy45n5zt9yuqss8h26pkjatu9u0xtmek5uc72en3k9es2evf3yw552rsa35vu9',
    'addr_test1qp9u2f6e2ss4knzs04mk790mg7r36dw6n60tpy45n5zt9yl0pqa5s43kzc0s0x8fm59ltwd4vy6jcyh0d026wteklwfqfsgj2x',
    'addr_test1qp9u2f6e2ss4knzs04mk790mg7r36dw6n60tpy45n5zt9y6uly7jvfa83xwf4dg9pvq2jvr28rjjtcf5jk9wlw4gl99qhgxzrl',
    'addr_test1qp9u2f6e2ss4knzs04mk790mg7r36dw6n60tpy45n5zt9yu9xdfvzp305lr3ghnn4lp76ut4qcc4f0le0442uaygdyks7e5s3g'
  ]; // TODO move to walletConfiguration & WalletRepositoryConfig
  await walletAddressPageAssert.assertSeeAddressCardsWithNoAda(testAutomationWalletAdditionalAddresses);
});

Then(/^I see "Unused address" card in "Advanced mode" for "([^"]*)" wallet$/, async (testWalletName: string) => {
  let expectedUnusedAddress;
  if (testWalletName === 'TestAutomationWallet') {
    expectedUnusedAddress =
      'addr_test1qqwt4f55kmzera42pu86svrck7qghskjk89dwk54fh5fkfmn76le4yjzc77ld2qv6vzxxxvsqspxnx7g3mktx93qthjqw3gggf'; // TODO move to walletConfiguration & WalletRepositoryConfig
  }
  await walletAddressPageAssert.assertSeeUnusedAddressCard(true, expectedUnusedAddress);
});

Then(/^I (see|do not see) "Unused address" card in "Advanced mode"$/, async (shouldSee: 'see' | 'do not see') => {
  await walletAddressPageAssert.assertSeeUnusedAddressCard(shouldSee === 'see');
});

Then(/^I see "Unused address" warning$/, async () => {
  await walletAddressPageAssert.assertSeeAddNewAddressBanner();
});

Then(
  /^I see "Add address" button (enabled|disabled) in "Advanced mode"$/,
  async (buttonState: 'enabled' | 'disabled') => {
    await walletAddressPageAssert.assertSeeAddNewAddressButton(buttonState);
  }
);

When(/^I click "Add address" button in "Advanced mode"$/, async () => {
  await walletAddressPage.clickAddNewAddressButton();
  await browser.pause(1000);
});

When(/^I save unused address$/, async () => {
  await walletAddressPage.saveLastAddress();
});

When(/^"Unused address" card address is different than the saved one$/, async () => {
  await walletAddressPageAssert.assertDisplayedUnusedAddressIsDifferentThanSaved();
});

Then(/^Saved "Unused address" card is penultimate$/, async () => {
  await walletAddressPageAssert.assertSeeSavedUnusedAddressCardPenultimate();
});

When(/^I hover over (\d+) address card$/, async (index: number) => {
  await (await walletAddressPage.addressCards)[index].moveTo();
});

When(/^I see copy button on (\d+) address card$/, async (index: number) => {
  await browser.pause(500);
  await walletAddressPageAssert.assertSeeCopyButtonOnAddressCard(index);
});

When(/^I click copy button on (\d+) address card$/, async (index: number) => {
  await walletAddressPage.clickCopyButtonOnAddressCard(index);
});

When(/^I save address for (\d+) address card$/, async (index: number) => {
  await walletAddressPage.saveAddressForCard(index);
});

When(/^I hover over "Advanced mode" toggle info icon$/, async () => {
  await walletAddressPage.hoverOverAdvancedModeToggleIcon();
});

When(/^I see tooltip for "Advanced mode" toggle info icon$/, async () => {
  await walletAddressPageAssert.assertSeeAdvancedModeToggleTooltip();
});
