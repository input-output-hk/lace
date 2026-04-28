import { isNetworkType } from './types';

import type { NetworkType } from './types';

/**
 * Parses a feature-flag payload into a {@link NetworkType}, handling both the
 * bare-string form (`"mainnet"` / `"testnet"`) and the object form
 * (`{ networkType: "mainnet" | "testnet" }`).  Returns `undefined` when the
 * payload does not match either shape.
 */
export const parseNetworkTypePayload = (
  payload: unknown,
): NetworkType | undefined => {
  if (isNetworkType(payload)) return payload;

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'networkType' in payload &&
    isNetworkType(payload.networkType)
  ) {
    return payload.networkType;
  }

  return undefined;
};
