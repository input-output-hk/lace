import { Given, Then, When } from '@cucumber/cucumber';
import AddressBookPageAssert from '../assert/addressBook/AddressBookPageAssert';
import AddressBookPage from '../elements/addressbook/AddressBookPage';
import AddressDetailsAssert from '../assert/addressBook/AddressDetailsAssert';
import AddressDetails from '../elements/addressbook/AddressDetails';
import DeleteAddressModal from '../elements/addressbook/DeleteAddressModal';
import DeleteAddressModalAssert from '../assert/addressBook/DeleteAddressModalAssert';
import AddNewAddressDrawerAssert from '../assert/addressBook/AddNewAddressDrawerAssert';
import AddNewAddressDrawer from '../elements/addressbook/AddNewAddressDrawer';
import EditAddressDrawer from '../elements/addressbook/EditAddressDrawer';
import EditAddressDrawerAssert from '../assert/addressBook/EditAddressDrawerAssert';
import testContext from '../utils/testContext';
import commonAssert from '../assert/commonAssert';
import {
  adaHandle1,
  adaHandle2,
  byron,
  getAddressByName,
  getAddressDetailsByName,
  icarus,
  shelley,
  validAddress
} from '../data/AddressData';
import indexedDB from '../fixture/indexedDB';
import popupView from '../page/popupView';
import extendedView from '../page/extendedView';
import { browser } from '@wdio/globals';
import AddressForm from '../elements/addressbook/AddressForm';
import ToastMessageAssert from '../assert/toastMessageAssert';
import { t } from '../utils/translationService';
import ReviewAddressDrawerAssert from '../assert/addressBook/ReviewAddressDrawerAssert';
import { getTestWallet } from '../support/walletConfiguration';
import ReviewAddressDrawer from '../elements/addressbook/ReviewAddressDrawer';
import Modal from '../elements/modal';
import mainMenuPageObject from '../pageobject/mainMenuPageObject';
import { getNonActiveAdaHandle2WalletName, getNonActiveAdaHandleWalletName } from '../utils/walletUtils';

const addressAddedToastTranslationKey = 'browserView.addressBook.toast.addAddress';

Given(
  /^I don't have any addresses added to my address book in (popup|extended) mode$/,
  async (mode: 'popup' | 'extended') => {
    await indexedDB.clearAddressBook();
    await browser.pause(500);
    await (mode === 'popup' ? popupView.visitAddressBook() : extendedView.visitAddressBook());
    await AddressBookPageAssert.assertSeeAddressBookTitle();
  }
);

Given(/^I have 3 addresses in my address book in (popup|extended) mode$/, async (mode: 'popup' | 'extended') => {
  await indexedDB.clearAddressBook();
  await indexedDB.insertAddress(shelley);
  await indexedDB.insertAddress(byron);
  await indexedDB.insertAddress(icarus);
  await browser.pause(500);
  if (mode === 'popup') {
    await popupView.visitAddressBook();
    await AddressBookPageAssert.assertSeeAddressBookTitle();
  } else {
    await extendedView.visitAddressBook();
  }
});

Given(
  /^I have 2 addresses with ADA handle in my address book in (popup|extended) mode$/,
  async (mode: 'popup' | 'extended') => {
    await indexedDB.clearAddressBook();
    await indexedDB.insertAddress(adaHandle1);
    await indexedDB.insertAddress(adaHandle2);
    await browser.pause(500);
    if (mode === 'popup') {
      await popupView.visitAddressBook();
      await AddressBookPageAssert.assertSeeAddressBookTitle();
    } else {
      await extendedView.visitAddressBook();
    }
  }
);

Given(/^address book contains address with name that has 12 characters$/, async () => {
  const addressEntry = validAddress;
  addressEntry.setName('abcdefghijkl');
  await indexedDB.clearAddressBook();
  await indexedDB.insertAddress(addressEntry);
});

Given(/^Address book is empty$/, async () => {
  await indexedDB.clearAddressBook();
});

Given(/^address book contains address with name that has more than 12 characters$/, async () => {
  const addressEntry = validAddress;
  addressEntry.setName('abcdefghijklm');
  await indexedDB.clearAddressBook();
  await indexedDB.insertAddress(addressEntry);
});

Given(/^I open address book in (popup|extended) mode$/, async (mode: 'popup' | 'extended') => {
  if (mode === 'popup') {
    await popupView.visitAddressBook();
    await AddressBookPageAssert.assertSeeAddressBookTitle();
  } else {
    await extendedView.visitAddressBook();
  }
});

Then(/^I see address book title$/, async () => {
  await AddressBookPageAssert.assertSeeAddressBookTitle();
});

Then(/^I see address count: ([\d+])$/, async (expectedNumber: number) => {
  await AddressBookPageAssert.assertSeeAddressCount(expectedNumber);
});

When(/^I click address on the list with name "([^"]*)"$/, async (addressName: string) => {
  const selectedRow = await AddressBookPage.getAddressRowByName(addressName);
  await selectedRow.click();
});

Then(
  /^I (see|don't see) address row with name "([^"]*)" and address "([^"]*)" on the list in (extended|popup) mode$/,
  async (shouldSee: string, name: string, address: string, mode: 'extended' | 'popup') => {
    await AddressBookPageAssert.assertSeeAddressOnTheList(
      name,
      String(getAddressByName(address) ?? address),
      shouldSee === 'see',
      mode
    );
  }
);

Then(/^I see warning for address row with name "([^"]*)"$/, async (address: string) => {
  await AddressBookPageAssert.assertSeeHandleWarningForAddress(address);
});

Then(/^I hover over the warning icon for "([^"]*)" handle/, async (handle: string) => {
  await AddressBookPage.hoverOverWarningIcon(handle);
});

Then(/^I see handle warning tooltip$/, async () => {
  await AddressBookPageAssert.assertSeeHandleWarningTooltip();
});

Then(/^address list is displayed and each row consists of avatar, name and address$/, async () => {
  await AddressBookPageAssert.assertSeeEachAddressRow();
});

When(/^I click "Add address" button on address book page$/, async () => {
  await AddressBookPage.clickAddAddressButton();
});

Then(/^I (see|do not see) "Add address" button on address book page$/, async (shouldSee: 'see' | 'do not see') => {
  await AddressBookPageAssert.assertSeeAddNewAddressButton(shouldSee === 'see');
});

Then(/^I see empty address book$/, async () => {
  await AddressBookPageAssert.assertAddressBookIsEmpty();
});

Then(
  /^I (see|do not see) address detail page in (extended|popup) mode with details of "([^"]*)" address$/,
  async (shouldSee: 'see' | 'do not see', mode: 'extended' | 'popup', addressName: string) => {
    const addressDetails = getAddressDetailsByName(addressName);
    if (!addressDetails) {
      throw new Error(`Unable to find address details for: ${addressName}`);
    }
    await AddressDetailsAssert.assertSeeAddressDetailsPage(shouldSee === 'see', mode, addressDetails);
  }
);

When(/^I click "(Copy|Delete|Edit)" button on address details page$/, async (button: 'Copy' | 'Delete' | 'Edit') => {
  switch (button) {
    case 'Copy':
      testContext.save('address', await AddressDetails.address.getText());
      await AddressDetails.copyButton.waitForStable();
      await AddressDetails.copyButton.waitForClickable();
      await AddressDetails.copyButton.click();
      break;
    case 'Delete':
      await AddressDetails.deleteButton.waitForStable();
      await AddressDetails.deleteButton.waitForClickable();
      await AddressDetails.deleteButton.click();
      break;
    case 'Edit':
      await AddressDetails.editButton.waitForStable();
      await AddressDetails.editButton.waitForClickable();
      await AddressDetails.editButton.click();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^I (see|do not see) delete address modal$/, async (shouldSee: 'see' | 'do not see') => {
  await DeleteAddressModalAssert.assertSeeDeleteAddressModal(shouldSee === 'see');
});

When(
  /^I click "(Cancel|Delete address)" button on delete address modal$/,
  async (button: 'Cancel' | 'Delete address') => {
    switch (button) {
      case 'Cancel':
        await DeleteAddressModal.cancelButton.waitForClickable();
        await DeleteAddressModal.cancelButton.click();
        break;
      case 'Delete address':
        await DeleteAddressModal.deleteAddressButton.waitForClickable();
        await DeleteAddressModal.deleteAddressButton.click();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(/^I see "Add new address" drawer in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await AddNewAddressDrawerAssert.assertSeeAddNewAddressDrawer(mode);
});

Then(/^I see "Add address" drawer in send flow in (extended|popup) mode$/, async (mode: 'extended' | 'popup') => {
  await AddNewAddressDrawerAssert.assertSeeAddNewAddressDrawer(mode, true);
});

Then(
  /^"Save address" button is (enabled|disabled) on "Add new address" drawer$/,
  async (state: 'enabled' | 'disabled') => {
    await AddNewAddressDrawerAssert.assertSaveAddressButtonEnabled(state === 'enabled');
  }
);

When(
  /^I click "(Save address|Cancel)" button on "Add new address" drawer$/,
  async (button: 'Save address' | 'Cancel') => {
    switch (button) {
      case 'Cancel':
        await AddNewAddressDrawer.clickOnCancelButton();
        break;
      case 'Save address':
        await AddNewAddressDrawer.clickOnSaveAddressButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(
  /^I see "Edit address" drawer in (extended|popup) mode with details of "([^"]*)" address$/,
  async (mode: 'extended' | 'popup', addressName: string) => {
    const addressDetails = getAddressDetailsByName(addressName);
    if (!addressDetails) {
      throw new Error(`Unable to find address details for: ${addressName}`);
    }
    await EditAddressDrawerAssert.assertSeeEditAddressDrawer(mode, addressDetails);
  }
);

When(/^I click "(Cancel|Done)" button on "Edit address" drawer$/, async (button: 'Cancel' | 'Done') => {
  switch (button) {
    case 'Cancel':
      await EditAddressDrawer.clickOnCancelButton();
      break;
    case 'Done':
      await EditAddressDrawer.clickOnDoneButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^"Done" button is (enabled|disabled) on "Edit address" drawer$/, async (state: 'enabled' | 'disabled') => {
  await EditAddressDrawerAssert.assertDoneButtonEnabled(state === 'enabled');
});

Then(/^address is saved to clipboard$/, async () => {
  const expectedWalletAddress = String(testContext.load('address'));
  await commonAssert.assertClipboardContains(expectedWalletAddress);
});

Then(
  /^I add new address: "([^"]*)" with name: "([^"]*)" in (extended|popup) mode$/,
  async (address: string, name: string, mode: 'extended' | 'popup') => {
    if (mode === 'popup') {
      await popupView.visitAddressBook();
      await AddressBookPageAssert.assertSeeAddressBookTitle();
    } else {
      await extendedView.visitAddressBook();
    }
    await AddressBookPage.clickAddAddressButton();
    await AddressForm.enterName(name === 'empty' ? '' : name);
    await AddressForm.enterAddress(address === 'empty' ? '' : address);
    await browser.pause(500); // Wait for input field value validation
    await AddNewAddressDrawer.clickOnSaveAddressButton();
  }
);

Then(
  /^I verify that address: "([^"]*)" with name: "([^"]*)" has been added in (extended|popup) mode$/,
  async (address: string, name: string, mode: 'extended' | 'popup') => {
    await ToastMessageAssert.assertSeeToastMessage(await t(addressAddedToastTranslationKey), true);
    await AddressBookPageAssert.assertSeeAddressOnTheList(name, address, true, mode);
  }
);

Then(
  /^I delete address with name: "([^"]*)" in (extended|popup) mode$/,
  async (name: string, mode: 'extended' | 'popup') => {
    if (mode === 'popup') {
      await popupView.visitAddressBook();
      await AddressBookPageAssert.assertSeeAddressBookTitle();
    } else {
      await extendedView.visitAddressBook();
    }
    const selectedRow = await AddressBookPage.getAddressRowByName(name);
    await selectedRow.click();
    await AddressDetails.deleteButton.waitForClickable();
    await AddressDetails.deleteButton.click();
    await DeleteAddressModal.deleteAddressButton.waitForClickable();
    await DeleteAddressModal.deleteAddressButton.click();
  }
);

Then(
  /^I see review handle drawer in (extended|popup) mode for handle: "([^"]*)"$/,
  async (mode: 'extended' | 'popup', handleName: string) => {
    const previousAddress = String(getTestWallet(testContext.load('activeWallet')).accounts[0].address);
    const receiverWallet =
      mode === 'extended'
        ? getTestWallet(getNonActiveAdaHandleWalletName())
        : getTestWallet(getNonActiveAdaHandle2WalletName());
    const newAddress = String(receiverWallet.accounts[0].address);
    await ReviewAddressDrawerAssert.assertSeeReviewAddressDrawer(mode, handleName, previousAddress, newAddress);
  }
);

When(/^I click "(Accept|Delete)" button on review handle drawer$/, async (button: 'Accept' | 'Delete') => {
  switch (button) {
    case 'Accept':
      await ReviewAddressDrawer.clickAcceptButton();
      break;
    case 'Delete':
      await ReviewAddressDrawer.clickDeleteButton();
      break;
    default:
      throw new Error(`Unsupported button name: ${button}`);
  }
});

Then(/^I (see|don't see) "Are you sure" review address modal$/, async (shouldSee: string) => {
  await ReviewAddressDrawerAssert.assertSeeAreYouSureReviewModal(shouldSee === 'see');
});

When(
  /^I click "(Proceed|Cancel)" button on "Are you sure" review address modal$/,
  async (button: 'Proceed' | 'Cancel') => {
    switch (button) {
      case 'Proceed':
        await Modal.clickConfirmButton();
        break;
      case 'Cancel':
        await Modal.clickCancelButton();
        break;
      default:
        throw new Error(`Unsupported button name: ${button}`);
    }
  }
);

Then(
  /^I add address with name: "([^"]*)" and address: "([^"]*)" to address book in (extended|popup) mode$/,
  async (name: string, address: string, mode: 'extended' | 'popup') => {
    await mainMenuPageObject.navigateToSection('Address Book', mode);
    await AddressBookPage.clickAddAddressButton();
    await AddressForm.enterName(name === 'empty' ? '' : name);
    await browser.pause(500); // Wait for input field value validation
    await AddressForm.enterAddress(address === 'empty' ? '' : address);
    await browser.pause(500); // Wait for input field value validation
    await AddNewAddressDrawer.clickOnSaveAddressButton();
    await ToastMessageAssert.assertSeeToastMessage(await t(addressAddedToastTranslationKey), true);
  }
);
