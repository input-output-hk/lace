import CIP95TestDApp from '../elements/CIP95TestDApp';
import { expect } from 'chai';
import { DataTable } from '@cucumber/cucumber';

class CIP95StaticMethodsAssert {
  async assertSeeResultForGetPubDRepKey(expectedKey: string): Promise<void> {
    const expectedText = `.cip95.getPubDRepKey(): ${expectedKey}`;
    await CIP95TestDApp.pubDRepKey.waitForDisplayed();
    expect(await CIP95TestDApp.pubDRepKey.getText()).equals(expectedText);
  }

  async assertSeeNoResultsForGetRegisteredPubStakeKeys(): Promise<void> {
    await CIP95TestDApp.noRegisteredPubStakeKeysMessage.waitForDisplayed();
    expect(await CIP95TestDApp.noRegisteredPubStakeKeysMessage.getText()).equals(
      'No registered public stake keys returned.'
    );
    await CIP95TestDApp.registeredPubStakeKey(0).waitForExist({ reverse: true });
  }

  async assertSeeNoResultsForGetUnregisteredPubStakeKeys(): Promise<void> {
    await CIP95TestDApp.noUnregisteredPubStakeKeysMessage.waitForDisplayed();
    expect(await CIP95TestDApp.noUnregisteredPubStakeKeysMessage.getText()).equals(
      'No unregistered public stake keys returned.'
    );
    await CIP95TestDApp.unregisteredPubStakeKey(0).waitForExist({ reverse: true });
  }

  async assertSeeResultsForGetRegisteredPubStakeKeys(testData: DataTable): Promise<void> {
    for (const row of testData.hashes()) {
      const entry = await CIP95TestDApp.registeredPubStakeKey(Number(row.index));
      await entry.waitForDisplayed();
      expect(await entry.getText()).equals(row.key);
    }
  }

  async assertSeeResultsForGetUnregisteredPubStakeKeys(testData: DataTable): Promise<void> {
    for (const row of testData.hashes()) {
      const entry = await CIP95TestDApp.unregisteredPubStakeKey(Number(row.index));
      await entry.waitForDisplayed();
      expect(await entry.getText()).equals(row.key);
    }
  }
}

export default new CIP95StaticMethodsAssert();
