import { Then, When } from '@wdio/cucumber-framework';
import { getTestWallet } from '../support/walletConfiguration';
import walletAddressPageAssert from '../assert/walletAddressPageAssert';
import walletAddressPage from '../elements/walletAddressPage';
import MenuHeader from '../elements/menuHeader';
import { assert } from 'chai';

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
    'addr_test1qqtwywurxyzpaj47fk2zvrvrk8pjmfevdm79lwpqprlehw3whkp6nu4xa245h28we8hsxhpkswu0yl7z2r48x70z2nqqae5w3z',
    'addr_test1qpxaz0jx5alxye49lr3q3c4rcalu9vlny75rxdulrgykzhfwhkp6nu4xa245h28we8hsxhpkswu0yl7z2r48x70z2nqqwxwg6w',
    'addr_test1qrn7uuaeq0un44ju0qyjj0ndtetue6z28j3p40h4gasm3g3whkp6nu4xa245h28we8hsxhpkswu0yl7z2r48x70z2nqq5c6lqf',
    'addr_test1qpuggh7wq0tk3fl9tnqxp5smcn8dkw2h0pz2yyglqpt8wz3whkp6nu4xa245h28we8hsxhpkswu0yl7z2r48x70z2nqqux74rq',
    'addr_test1qz0qskuhrc7nsxy5zwramrp02dxp7wt4d35van3e9vd0hepwhkp6nu4xa245h28we8hsxhpkswu0yl7z2r48x70z2nqqcn9rdy'
  ]; // TODO move to walletConfiguration & WalletRepositoryConfig
  await walletAddressPageAssert.assertSeeAddressCardsWithNoAda(testAutomationWalletAdditionalAddresses);
});

Then(/^I see "Unused address" card in "Advanced mode" for "([^"]*)" wallet$/, async (testWalletName: string) => {
  let expectedUnusedAddress;
  if (testWalletName === 'TestAutomationWallet') {
    expectedUnusedAddress =
      'addr_test1qzgcga96klwu99dhw93mf53g9cmszuwd3mkt544g538sn7fwhkp6nu4xa245h28we8hsxhpkswu0yl7z2r48x70z2nqqmm73xn'; // TODO move to walletConfiguration & WalletRepositoryConfig
  } else {
    assert.fail(`expected unused address for wallet ${testWalletName} not found`);
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
