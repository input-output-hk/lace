import type { DappId, ConnectionContextId } from './value-objects';
import type { BlockchainName } from '@lace-lib/util-store';

export type Dapp = {
  id: DappId;
  imageUrl: string;
  name: string;
  origin: string;
};

export type AuthorizedDapp = {
  blockchain: BlockchainName;
  dapp: Dapp;
  isPersisted: boolean;
};

export type ConnectionSource = {
  url: string;
  contextId: ConnectionContextId;
};

export type DappConnection = {
  blockchainName: BlockchainName;
  source: ConnectionSource;
};
