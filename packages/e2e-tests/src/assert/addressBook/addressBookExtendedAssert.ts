import webTester from '../../actor/webTester';
import { AddressRow } from '../../elements/addressbook/extendedview/AddressRow';
import { AddressInput } from '../../elements/addressInput';
import { expect } from 'chai';

class AddressBookExtendedAssert {
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
