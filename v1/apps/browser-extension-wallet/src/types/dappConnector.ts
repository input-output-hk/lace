import { Origin } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import { Subject } from 'rxjs';

export type AuthorizedDappStorage = Record<string, Wallet.DappInfo[]>;
export type AuthorizedDappService = {
  removeAuthorizedDapp: (origin: Origin) => Promise<boolean>;
  authorizedDappsList: Subject<Wallet.DappInfo[]>;
};
