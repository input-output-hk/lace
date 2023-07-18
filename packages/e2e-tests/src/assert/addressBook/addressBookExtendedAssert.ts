import webTester from '../../actor/webTester';
import { AddressInput } from '../../elements/addressInput';
import { expect } from 'chai';
import { t } from '../../utils/translationService';

class AddressBookExtendedAssert {
  assertSeeAddressWithNameInAddressInput = async (address: string, name: string) => {
    await webTester.waitUntilSeeElementContainingText(name);
    const text = await webTester.getTextValueFromElement(new AddressInput().container());
    await expect(text).contains(address);
  };

  assertSeeEmptyAddressInput = async (index?: number) => {
    const text = await webTester.getTextValueFromElement(new AddressInput(index).container());
    await expect(text).to.equal(await t('core.destinationAddressInput.recipientAddress'));
  };
}

export default new AddressBookExtendedAssert();
