/* eslint-disable @typescript-eslint/no-explicit-any */
import { VersionedSchema } from '../database';
import { DbQueries } from '../hooks';
import { sortTabletByName } from '../helpers';
import { NftFoldersRecordParams } from '@src/features/nfts/context';
import { EnvironmentTypes } from '@src/stores';

export interface NftFoldersSchema {
  id: number;
  name: string;
  assets: Array<string>;
  network: EnvironmentTypes;
}

export const nftFoldersSchema: VersionedSchema = {
  table: 'nftFolders',
  indexedFields: {
    3: ['++id', '&name', 'assets', 'network']
  }
};

export const nftFoldersQueries = (
  currentChain: EnvironmentTypes
): DbQueries<NftFoldersSchema, NftFoldersRecordParams> => ({
  listQuery: (collection) =>
    collection.filter(({ network }) => network === currentChain).sortBy('name', sortTabletByName),
  saveRecordQuery: (table) => (record) => table.add({ ...record, network: currentChain })
});
