import webTester from '../../actor/webTester';
import { AddressRow } from '../../elements/addressbook/extendedview/AddressRow';
import AddressPage from '../../elements/addressbook/extendedview/AddressPage';
import { AddressInput } from '../../elements/addressInput';
import { t } from '../../utils/translationService';
import { expect } from 'chai';

class AddressBookExtendedAssert {
  assertSeeInformationAboutEmptyBook = async () => {
    await webTester.waitUntilSeeElementContainingText(await t('browserView.addressBook.emptyState.title'));
    await webTester.waitUntilSeeElementContainingText(await t('browserView.addressBook.emptyState.message'));
  };

  assertSeeAddressOnTheList = async (name: string, address: string, shouldSee: boolean) => {
    await browser.pause(500);
    const addressRow = new AddressRow(name);
    if (shouldSee) {
      await webTester.seeWebElement(addressRow.nameElement());
      await expect(((await addressRow.getAddress()) as string).slice(0, 8)).to.equal(address.slice(0, 8));
    } else {
      await webTester.dontSeeWebElement(addressRow.nameElement());
    }
  };

  assertSeeAddressCount = async (expectedCount: number) => {
    const currentValue = (await AddressPage.getCounter()) as string;
    await expect(currentValue).to.equal(expectedCount);
  };

  assertSeeAddressBookTitle = async () => {
    await webTester.waitUntilSeeElementContainingText(await t('addressBook.sectionTitle'));
  };

  assertSeeAddressWithNameInAddressInput = async (address: string, name: string) => {
    await webTester.waitUntilSeeElementContainingText(name);
    const text = await webTester.getTextValueFromElement(new AddressInput().container());
    await expect(text).contains(address);
  };

  assertSeeEmptyAddressInput = async (index?: number) => {
    const text = await webTester.getTextValueFromElement(new AddressInput(index).container());
    await expect(text).to.equal('');
  };
}

export default new AddressBookExtendedAssert();
