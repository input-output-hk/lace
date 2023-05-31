import { VersionedSchema } from '../database';

export interface DappSchema {
  id: number;
  name: string;
  url: string;
}

export const dappSchema: VersionedSchema = {
  table: 'dapp',
  indexedFields: {
    2: ['++id', '&name', '&url']
  }
};
