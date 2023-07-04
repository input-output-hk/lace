import webTester from '../../actor/webTester';
import { AddressListRow } from '../../elements/addressbook/AddressListRow';
import { expect } from 'chai';

class AddressBookAssert {
  assertSeeAddressOnTheList = async (name: string, address: string, shouldSee: boolean) => {
    await browser.pause(500);
    const addressRow = new AddressListRow(name);
    if (shouldSee) {
      await webTester.seeWebElement(addressRow.nameElement());
      await expect(((await addressRow.getAddress()) as string).slice(0, 15)).to.equal(address.slice(0, 15));
    } else {
      await webTester.dontSeeWebElement(addressRow.nameElement());
    }
  };

  assertSeeShortenedAddressOnTheList = async (name: string, address: string, shouldSee: boolean) => {
    await browser.pause(500);
    const addressRow = new AddressListRow(name);
    if (shouldSee) {
      const currentValue = ((await addressRow.getAddress()) as string).slice(0, 15);
      const expectedValue = `${address.slice(0, 8)}...${address.slice(-3)}`;

      await webTester.seeWebElement(addressRow.nameElement());
      await expect(currentValue).to.equal(expectedValue);
    } else {
      await webTester.dontSeeWebElement(addressRow.nameElement());
    }
  };
}

export default new AddressBookAssert();
