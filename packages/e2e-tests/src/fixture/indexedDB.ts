import { Logger } from '../support/logger';
import extensionUtils from '../utils/utils';
import { Address } from '../data/Address';
import { NFTFolder } from '../data/NFTFolder';

/* eslint-disable @typescript-eslint/no-shadow */
class IndexedDB {
  async clearAddressBook() {
    Logger.log('Clearing address book store in OneWalletDB');
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

  async clearNFTFolders() {
    Logger.log('Clearing NFT folders store in OneWalletDB');
    await driver.execute(() => {
      const openRequest = window.indexedDB.open('OneWalletDB');
      openRequest.onsuccess = function () {
        const db = openRequest.result;
        const transaction = db.transaction(['nftFolders'], 'readwrite');
        const objectStore = transaction.objectStore('nftFolders');
        objectStore.clear();
      };
    });
  }

  async insertNFTFolder(nftFolder: NFTFolder) {
    const network = extensionUtils.getNetwork().name;
    Logger.log(
      `Inserting NFT folder to OneWalletDB, name: ${nftFolder.getName()}, assets: ${nftFolder.getAssets()}, network: ${network}`
    );
    await driver.execute(
      (name: string, assets: string[], network: string) => {
        const openRequest = window.indexedDB.open('OneWalletDB');
        openRequest.onsuccess = function () {
          const db = openRequest.result;
          const transaction = db.transaction(['nftFolders'], 'readwrite');
          const objectStore = transaction.objectStore('nftFolders');
          const item = {
            name,
            assets,
            network
          };
          objectStore.add(item);
        };
      },
      nftFolder.getName(),
      nftFolder.getAssets(),
      network
    );
  }
}

export default new IndexedDB();
