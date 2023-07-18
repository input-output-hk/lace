import { Then } from '@cucumber/cucumber';
import addressBookExtendedAssert from '../assert/addressBook/addressBookExtendedAssert';

Then(
  /^address input contains address "([^"]*)" and name "([^"]*)"$/,
  async (lastCharsOfAddress: string, addressName: string) => {
    await addressBookExtendedAssert.assertSeeAddressWithNameInAddressInput(lastCharsOfAddress, addressName);
  }
);

Then(/^address input (\d*) is empty$/, async (inputIndex: number) => {
  await addressBookExtendedAssert.assertSeeEmptyAddressInput(inputIndex);
});
