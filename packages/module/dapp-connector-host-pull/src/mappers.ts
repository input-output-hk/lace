import { DappId } from '@lace-contract/dapp-connector';

import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { AuthorizedDappInfo } from '@lace-lib/extension-shell-api';
import type { BlockchainName } from '@lace-lib/util-store';

const BLOCKCHAIN_NAMES: readonly BlockchainName[] = [
  'Bitcoin',
  'Cardano',
  'Midnight',
];

/** Version-skew guard (ADR 41 handshake): the wire `blockchain` is an open
 * string — a newer host may serve buckets this build's `BlockchainName`
 * union does not know, and those entries are skipped rather than typed in. */
const isBlockchainName = (value: string): value is BlockchainName =>
  (BLOCKCHAIN_NAMES as readonly string[]).includes(value);

/**
 * Group the flat `dapps.list` projection into the authorizedDapps slice
 * shape. Hydrated entries carry `isPersisted: true` — they exist in the
 * host's persisted grant table.
 */
export const authorizedDappsFromWire = (
  entries: AuthorizedDappInfo[],
): AuthorizedDappsDataSlice => {
  const slice: AuthorizedDappsDataSlice = {};
  for (const { blockchain, dapp } of entries) {
    if (!isBlockchainName(blockchain)) continue;
    (slice[blockchain] ??= []).push({
      blockchain,
      dapp: {
        id: DappId(dapp.id),
        imageUrl: dapp.imageUrl,
        name: dapp.name,
        origin: dapp.origin,
      },
      isPersisted: true,
    });
  }
  return slice;
};
