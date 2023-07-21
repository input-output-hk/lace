import { Wallet } from '@lace/cardano';
export const USER_ID_SERVICE_BASE_CHANNEL = 'user-id-actions';

export interface UserIdService {
  getId(): Promise<string>;
  clearId(): Promise<void>;
  makePersistent(): Promise<void>;
  makeTemporary(): Promise<void>;
  extendLifespan(): Promise<void>;
  getHashId(chainName: Wallet.ChainName): Promise<string>;
  getIsPersistentId(): Promise<boolean>;
}
