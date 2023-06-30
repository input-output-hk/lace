import { expect } from 'chai';
import { t } from '../../utils/translationService';
import AddressBookPage from '../../elements/addressbook/AddressBookPage';

class AddressBookPageAssert {
  assertSeeAddressBookTitle = async () => {
    await AddressBookPage.pageTitle.waitForDisplayed();
    await expect(await AddressBookPage.pageTitle.getText()).to.contain(await t('addressBook.sectionTitle'));
  };
  assertSeeAddressCount = async (expectedCount: number) => {
    await AddressBookPage.addressCounter.waitForDisplayed();
    const currentValue = await AddressBookPage.getCounterValue();
    await expect(currentValue).to.equal(expectedCount);
  };

  assertAddressBookIsEmpty = async () => {
    await expect(Number(await AddressBookPage.getCounterValue())).to.equal(0);
    await AddressBookPage.emptyStateImage.waitForDisplayed();
    await AddressBookPage.emptyStateTitle.waitForDisplayed();
    await expect(await AddressBookPage.emptyStateTitle.getText()).to.equal(
      await t('browserView.addressBook.emptyState.title')
    );
    await AddressBookPage.emptyStateMessage.waitForDisplayed();
    await expect(await AddressBookPage.emptyStateMessage.getText()).to.equal(
      await t('browserView.addressBook.emptyState.message')
    );
    await AddressBookPage.addressListHeader.waitForDisplayed({ reverse: true });
    await AddressBookPage.addressList.waitForDisplayed({ reverse: true });
  };
}

export default new AddressBookPageAssert();
