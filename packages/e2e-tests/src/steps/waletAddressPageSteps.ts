import { Then, When } from '@wdio/cucumber-framework';
import { getTestWallet } from '../support/walletConfiguration';
import walletAddressPageAssert from '../assert/walletAddressPageAssert';
import walletAddressPage from '../elements/walletAddressPage';
import ToastMessageAssert from '../assert/toastMessageAssert';
import { t } from '../utils/translationService';
import ToastMessage from '../elements/toastMessage';

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
  await walletAddressPage.addressCard.scrollIntoView();
  await walletAddressPage.addressCard.moveTo();
  await walletAddressPage.copyButton.click();
});

When(/^I click "Copy" button on "Receive" page for handle: "([^"]*)"$/, async (handleName: string) => {
  await walletAddressPage.clickCopyButtonForHandle(handleName);
});

When(/^I see address card for handle: "([^"]*)"$/, async (handleName: string) => {
  await walletAddressPageAssert.assertSeeAdaHandleAddressCardWithName(handleName);
});

Then(/^The first ADA handle displayed on the list is the shortest$/, async () => {
  await walletAddressPageAssert.assertSeeTheShortestHandleFirst();
});

Then(/^I see a toast with text: "(Handle|Address) copied"$/, async (action: string) => {
  let translationKey;
  switch (action) {
    case 'Handle':
      translationKey = 'core.infoWallet.handleCopied';
      break;
    case 'Address':
      translationKey = 'core.infoWallet.addressCopied';
      break;
    default:
      throw new Error(`Unsupported action name: ${action}`);
  }

  await ToastMessageAssert.assertSeeToastMessage(await t(translationKey), true);
  await ToastMessage.closeButton.click();
});

Then(/^I see ADA handle with custom image on the "Wallet Address" page$/, async () => {
  await walletAddressPageAssert.assertSeeAdaHandleCardWithCustomImage();
});
