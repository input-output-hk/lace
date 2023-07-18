import { expect } from 'chai';
import { t } from '../../utils/translationService';
import AddressBookPage from '../../elements/addressbook/AddressBookPage';

class AddressBookPageAssert {
  assertSeeAddNewAddressButton = async (shouldSee: boolean) => {
    await AddressBookPage.addAddressButton.waitForDisplayed({ reverse: !shouldSee });
    if (shouldSee) {
      expect(await AddressBookPage.addAddressButton.getText()).to.equal(await t('addressBook.empty.addNewAddress'));
    }
  };

  assertSeeAddressBookTitle = async () => {
    await AddressBookPage.pageTitle.waitForDisplayed();
    expect(await AddressBookPage.pageTitle.getText()).to.contain(await t('addressBook.sectionTitle'));
  };
  assertSeeAddressCount = async (expectedCount: number) => {
    await AddressBookPage.addressCounter.waitForDisplayed();
    const currentValue = await AddressBookPage.getCounterValue();
    expect(currentValue).to.equal(expectedCount);
  };

  assertAddressBookIsEmpty = async () => {
    expect(Number(await AddressBookPage.getCounterValue())).to.equal(0);
    await AddressBookPage.emptyStateImage.waitForDisplayed();
    await AddressBookPage.emptyStateTitle.waitForDisplayed();
    expect(await AddressBookPage.emptyStateTitle.getText()).to.equal(
      await t('browserView.addressBook.emptyState.title')
    );
    await AddressBookPage.emptyStateMessage.waitForDisplayed();
    expect(await AddressBookPage.emptyStateMessage.getText()).to.equal(
      await t('browserView.addressBook.emptyState.message')
    );
    await AddressBookPage.addressListHeader.waitForDisplayed({ reverse: true });
    await AddressBookPage.addressList.waitForDisplayed({ reverse: true });
  };

  assertSeeAddressOnTheList = async (name: string, address: string, shouldSee: boolean, mode: 'extended' | 'popup') => {
    const addressRow = await AddressBookPage.getAddressRowByName(name);
    if (shouldSee) {
      await addressRow.waitForDisplayed();
      await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_AVATAR).waitForDisplayed();
      await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_NAME).waitForDisplayed();
      await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_ADDRESS).waitForDisplayed();
      const actualAddress = await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_ADDRESS).getText();
      const expectedAddress1stPart = mode === 'extended' ? `${address.slice(0, 22)}` : `${address.slice(0, 8)}`;
      const expectedAddress2ndPart = mode === 'extended' ? `${address.slice(-23)}` : `${address.slice(-3)}`;
      expect(
        actualAddress.startsWith(expectedAddress1stPart),
        `ACTUAL DISPLAYED ADDRESS: ${actualAddress}\nEXPECTED 1ST PART OF ADDRESS: ${expectedAddress1stPart}`
      ).to.be.true;
      expect(
        actualAddress.endsWith(expectedAddress2ndPart),
        `ACTUAL DISPLAYED ADDRESS: ${actualAddress}\nEXPECTED 2ND PART OF ADDRESS: ${expectedAddress2ndPart}`
      ).to.be.true;
    } else {
      expect(await addressRow).to.be.undefined;
    }
  };
}

export default new AddressBookPageAssert();
