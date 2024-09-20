import { DataTable, Then, When } from '@cucumber/cucumber';
import MessageSigningInputDrawerAssert from '../assert/settings/MessageSigningInputDrawerAssert';
import MessageSigningInputDrawer from '../elements/settings/MessageSigningInputDrawer';
import { dataTableAsStringArray } from '../utils/cucumberDataHelper';
import testContext from '../utils/testContext';
import MessageSigningConfirmationDrawerAssert from '../assert/settings/MessageSigningConfirmationDrawerAssert';
import MessageSigningAllDoneDrawerAssert from '../assert/settings/MessageSigningAllDoneDrawerAssert';
import MessageSigningAllDoneDrawer from '../elements/settings/MessageSigningAllDoneDrawer';

Then(/^"Message signing" drawer is displayed$/, async () => {
  await MessageSigningInputDrawerAssert.assertSeeMessageSigningInputDrawer();
});

When(/^I click on "Select an address to use" button$/, async () => {
  await MessageSigningInputDrawer.clickOnSelectAddressButton();
});

Then(/^the list of all available addresses is shown and contains:$/, async (addresses: DataTable) => {
  await MessageSigningInputDrawerAssert.assertSeeFollowingAddressesOnTheDropdownMenu(dataTableAsStringArray(addresses));
});

When(/^I select a random address from the list$/, async () => {
  await MessageSigningInputDrawer.selectRandomAddress();
});

Then(/^selected address is displayed on a drawer$/, async () => {
  const expectedAddress = String(testContext.load('selectedAddress'));
  await MessageSigningInputDrawerAssert.assertSeeSelectedAddress(expectedAddress);
});

When(/^I fill "Message to sign" field$/, async () => {
  await MessageSigningInputDrawer.fillMessageField('Hello World!');
});

When(/^I click on "Sign message" button$/, async () => {
  await MessageSigningInputDrawer.clickOnSignMessageButton();
});

Then(/^"Sign confirmation" drawer is displayed$/, async () => {
  await MessageSigningConfirmationDrawerAssert.assertSeeSignConfirmationDrawer();
});

Then(/^"All done" drawer is displayed for message signing flow$/, async () => {
  await MessageSigningAllDoneDrawerAssert.assertSeeAllDoneDrawer();
});

When(/^I click on "Copy signature to clipboard" button$/, async () => {
  await MessageSigningAllDoneDrawer.clickOnCopySignatureToClipboardButton();
});

Then(/^signature in clipboard is equal to the one displayed on drawer$/, async () => {
  await MessageSigningAllDoneDrawerAssert.assertSignatureInClipboardIsCorrect();
});

When(/^I click on "Close" button on "All done!" drawer for message signing$/, async () => {
  await MessageSigningAllDoneDrawer.clickOnCloseButton();
});
