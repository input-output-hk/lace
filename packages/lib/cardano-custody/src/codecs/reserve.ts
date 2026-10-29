// Ported from Biglup/cardano-account-custody-contract offchain/src/data.ts at
// revision b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for
// Lace: the reserve datum is recognised, not written.

import { Serialization } from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

/** The datum the upstream library writes on a reserve: constructor 0 with no fields. */
const RESERVE_DATUM_CBOR = 'd87980';

/**
 * Whether an inline datum is, byte for byte, the reserve datum `d87980`.
 * Any datum makes a deposit an owner-only reserve; only this one has a known
 * size, so a builder can spend such a reserve without a surprise in fee or
 * minimum lovelace.
 */
export const isCustodyReserveDatum = (datum: Cardano.PlutusData): boolean =>
  Serialization.PlutusData.fromCore(datum).toCbor() === RESERVE_DATUM_CBOR;
