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
    await AddressBookPage.emptyStateImage.waitForDisplayed();
    await AddressBookPage.emptyStateTitle.waitForDisplayed();
    expect(Number(await AddressBookPage.getCounterValue())).to.equal(0);
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
    if (name.length > 16) {
      name = `${name.slice(0, 12)}...`;
    }
    const addressRow = await AddressBookPage.getAddressRowByName(name);
    if (shouldSee) {
      await addressRow.waitForDisplayed();
      await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_AVATAR).waitForDisplayed();
      await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_NAME).waitForDisplayed();
      await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_ADDRESS).waitForDisplayed();
      const actualAddress = await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_ADDRESS).getText();
      const expectedAddress1stPart = `${address.slice(0, 5)}`;
      const expectedAddress2ndPart = mode === 'extended' ? `${address.slice(-5)}` : `${address.slice(-3)}`;
      expect(
        actualAddress.startsWith(expectedAddress1stPart),
        `ACTUAL DISPLAYED ADDRESS: ${actualAddress}\nEXPECTED 1ST PART OF ADDRESS: ${expectedAddress1stPart}`
      ).to.be.true;
      expect(
        actualAddress.endsWith(expectedAddress2ndPart),
        `ACTUAL DISPLAYED ADDRESS: ${actualAddress}\nEXPECTED 2ND PART OF ADDRESS: ${expectedAddress2ndPart}`
      ).to.be.true;
    } else {
      expect(addressRow).to.be.undefined;
    }
  };

  assertSeeHandleWarningForAddress = async (address: string) => {
    const addressRow = await AddressBookPage.getAddressRowByName(address);
    await addressRow.$(AddressBookPage.ADDRESS_LIST_ITEM_WARNING_ICON).waitForDisplayed();
  };

  assertSeeHandleWarningTooltip = async () => {
    await AddressBookPage.warningTooltip.waitForDisplayed();
    expect(await AddressBookPage.warningTooltip.getText()).to.equal(
      await t('core.addressBook.addressHandleTooltip', 'core')
    );
  };

  assertSeeEachAddressRow = async () => {
    const rows = await AddressBookPage.getAddressListRows();
    for (const row of rows) {
      await row.$(AddressBookPage.ADDRESS_LIST_ITEM_AVATAR).waitForDisplayed();
      await row.$(AddressBookPage.ADDRESS_LIST_ITEM_NAME).waitForDisplayed();
      await row.$(AddressBookPage.ADDRESS_LIST_ITEM_ADDRESS).waitForDisplayed();
    }
  };
}

export default new AddressBookPageAssert();
