import { MidnightSDKNetworkIds } from '@lace-contract/midnight-context';
import { firstValueFrom } from 'rxjs';

import type { MidnightNetworksConfig } from '@lace-contract/midnight-context';
import type { Observable } from 'rxjs';

/** The Veritee ledger is on preprod, including for mainnet proof servers. */
export const createVeriteeLedgerIndexerResolver =
  (
    networksConfig$: Observable<MidnightNetworksConfig>,
  ): (() => Promise<string>) =>
  async () =>
    (await firstValueFrom(networksConfig$))[MidnightSDKNetworkIds.PreProd]
      .indexerAddress;
