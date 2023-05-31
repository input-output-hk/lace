import { Logger } from '../support/logger';
import extensionUtils from '../utils/utils';
import { Address } from '../data/Address';

/* eslint-disable @typescript-eslint/no-shadow */
export default new (class IndexedDB {
  async clearAddressBook() {
    Logger.log('Clearing OneWalletDB');
    await driver.execute(() => {
      const openRequest = window.indexedDB.open('OneWalletDB');
      openRequest.onsuccess = function () {
        const db = openRequest.result;
        const transaction = db.transaction(['addressBook'], 'readwrite');
        const objectStore = transaction.objectStore('addressBook');
        objectStore.clear();
      };
    });
  }

  async insertAddress(address: Address) {
    const networkId = extensionUtils.getNetwork().id;
    Logger.log(
      `Inserting to OneWalletDB, name: ${address.getName()}, address: ${address.getAddress()}, network: ${networkId}`
    );
    await driver.execute(
      (address: string, name: string, networkId: number) => {
        const openRequest = window.indexedDB.open('OneWalletDB');
        openRequest.onsuccess = function () {
          const db = openRequest.result;
          const transaction = db.transaction(['addressBook'], 'readwrite');
          const objectStore = transaction.objectStore('addressBook');
          const item = {
            name: `${name}`,
            address: `${address}`,
            network: networkId
          };
          objectStore.add(item);
        };
      },
      address.getAddress(),
      address.getName(),
      networkId
    );
  }
})();
