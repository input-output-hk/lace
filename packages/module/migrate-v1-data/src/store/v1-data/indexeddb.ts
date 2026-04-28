import type { Cardano, Handle, HandleResolution } from '@cardano-sdk/core';

export interface V1AddressBookSchema {
  id: number;
  name: string;
  address: Cardano.PaymentAddress | Handle;
  handleResolution?: HandleResolution;
  network: Cardano.NetworkMagics;
}
export interface V1NftFoldersSchema {
  id: number;
  name: string;
  assets: Array<Cardano.AssetId>;
  network: keyof typeof Cardano.ChainIds;
}

const idbRequestToPromise = async <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onerror = reject;
    request.onsuccess = function () {
      resolve(this.result);
    };
  });

export const getIndexedbData = async () => {
  const oneWalletDb = await idbRequestToPromise(indexedDB.open('OneWalletDB'));

  const idbTransaction = oneWalletDb.transaction(['addressBook', 'nftFolders']);
  const addressBookObjectStore = idbTransaction.objectStore('addressBook');
  const nftFoldersObjectStore = idbTransaction.objectStore('nftFolders');
  const [v1AddressBookEntries, v1NftFolderEntries] = await Promise.all([
    idbRequestToPromise(
      addressBookObjectStore.getAll() as IDBRequest<V1AddressBookSchema[]>,
    ),
    idbRequestToPromise(
      nftFoldersObjectStore.getAll() as IDBRequest<V1NftFoldersSchema[]>,
    ),
  ]);
  idbTransaction.abort();
  return { v1AddressBookEntries, v1NftFolderEntries };
};
