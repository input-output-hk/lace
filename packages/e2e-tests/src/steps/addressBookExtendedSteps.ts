import { Then, When } from '@cucumber/cucumber';
import webTester from '../actor/webTester';
import addressBookExtendedAssert from '../assert/addressBook/addressBookExtendedAssert';
import { AddressRow } from '../elements/addressbook/extendedview/AddressRow';
import { FieldNameToCallback, fieldNameToLocator } from '../support/gherkin';
import { shelley } from '../data/AddressData';

Then(/address list is displayed and each row consists of:/, async (rows) => {
  const addresses = ['Byron', 'Icarus', 'Shelley'];
  for (const addr of addresses) {
    const testedRow = new AddressRow(addr);
    const fieldsAsserts: FieldNameToCallback[] = [
      ['Avatar', async () => await webTester.seeWebElement(testedRow.avatarElement())],
      ['Name', async () => await webTester.seeWebElement(testedRow.nameElement())],
      ['Address', async () => await testedRow.addressElement.waitForDisplayed()]
    ];
    for (const row of rows.raw()) {
      await fieldNameToLocator(fieldsAsserts, row).then(async (c) => await c());
    }
  }
});

When(/^I click address on the list with name "([^"]*)"$/, async (addressName: string) => {
  const selectedRow = new AddressRow(addressName).addressElement;
  await selectedRow.click();
});

Then(
  /^I (see|don't see) address with name "([^"]*)" and address "([^"]*)" on the list$/,
  async (shouldSee: string, name: string, address: string) => {
    if (address === 'shelley') {
      address = shelley.getAddress();
    }
    const expectedShouldSee = shouldSee === 'see';
    await addressBookExtendedAssert.assertSeeAddressOnTheList(name, address, expectedShouldSee);
  }
);

Then(
  /^address input contains address "([^"]*)" and name "([^"]*)"$/,
  async (lastCharsOfAddress: string, addressName: string) => {
    await addressBookExtendedAssert.assertSeeAddressWithNameInAddressInput(lastCharsOfAddress, addressName);
  }
);

Then(/^address input (\d*) is empty$/, async (inputIndex: number) => {
  await addressBookExtendedAssert.assertSeeEmptyAddressInput(inputIndex);
});
