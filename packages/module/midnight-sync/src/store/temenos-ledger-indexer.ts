import { MidnightSDKNetworkIds } from '@lace-contract/midnight-context';
import { firstValueFrom } from 'rxjs';

import type { MidnightNetworksConfig } from '@lace-contract/midnight-context';
import type { Observable } from 'rxjs';

/** The Temenos ledger is on preprod, including for mainnet proof servers. */
export const createTemenosLedgerIndexerResolver =
  (
    networksConfig$: Observable<MidnightNetworksConfig>,
  ): (() => Promise<string>) =>
  async () =>
    (await firstValueFrom(networksConfig$))[MidnightSDKNetworkIds.PreProd]
      .indexerAddress;
