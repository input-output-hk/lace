import { createJobsSlice } from '@lace-lib/util-store';

import type { Dapp } from '../';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';

export type AuthorizeDappRequest = BlockchainAssigned<{
  dapp: Dapp;
  /** Browser window ID where the requesting dApp tab lives (extension only). */
  windowId?: number;
}>;

export type AuthorizeDappFailed = {
  dapp: Dapp;
  reason: string;
};

export type AuthorizedDappCompleted = {
  dapp: Dapp;
} & (
  | {
      authorized: false;
    }
  | {
      authorized: true;
      blockchainName: BlockchainName;
    }
);

export const authorizeDappJobs = createJobsSlice('authorizeDapp', {
  start: ({ dapp }: AuthorizeDappRequest) => dapp.id,
  completed: ({ dapp }: AuthorizedDappCompleted) => dapp.id,
  failed: ({ dapp }: AuthorizeDappFailed) => dapp.id,
});
