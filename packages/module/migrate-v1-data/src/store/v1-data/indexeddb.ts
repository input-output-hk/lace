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

  const readStore = async <T>(
    storeName: 'addressBook' | 'nftFolders',
  ): Promise<T[]> => {
    try {
      const tx = oneWalletDb.transaction([storeName]);
      const result = await idbRequestToPromise(
        tx.objectStore(storeName).getAll() as IDBRequest<T[]>,
      );
      tx.abort();
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `migrate-v1-data: failed to read '${storeName}' from OneWalletDB`,
        error,
      );
      if ((error as { name?: string }).name === 'NotFoundError') return [];
      throw error;
    }
  };

  const [v1AddressBookEntries, v1NftFolderEntries] = await Promise.all([
    readStore<V1AddressBookSchema>('addressBook'),
    readStore<V1NftFoldersSchema>('nftFolders'),
  ]);

  return { v1AddressBookEntries, v1NftFolderEntries };
};
