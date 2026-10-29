// Ported from Biglup/cardano-account-custody-contract offchain/src/discovery.ts
// and offchain/src/state.ts at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// UTxOs that break the contract's shapes are listed as anomalies instead of
// throwing, a grant is read only in the shape logic version 1 issues,
// reserves are split by datum format, datum-hash deposits are stranded, and
// liveness names why a grant is dead.

import { Cardano } from '@cardano-sdk/core';

import { decodeCustodyGrant } from './codecs/account-state';
import { isCustodyReserveDatum } from './codecs/reserve';
import { isCustodyGrantCurrent, isCustodyGrantExpired } from './state/rules';
import { parseCustodyAccountTokenName } from './tokens';

import type { CustodyAccountState, CustodyGrant } from './codecs/account-state';
import type { CustodyDecodeError } from './codecs/plutus-data';
import type { Hash28ByteBase16 } from '@cardano-sdk/crypto';

/** Where an account lives and which tokens are its own. */
interface CustodyAccountLocation {
  /** The policy of every account token. */
  readonly accountValidatorHash: Hash28ByteBase16;
  /** Names the state NFT and prefixes every grant token. */
  readonly stakeScriptHash: Hash28ByteBase16;
  /** The full account address; UTxOs anywhere else are not the account's. */
  readonly address: Cardano.PaymentAddress;
}

/** A grant UTxO with the grant its inline datum carries. */
export interface CustodyGrantUtxo {
  readonly utxo: Cardano.Utxo;
  readonly grant: CustodyGrant;
  /** The grant token the UTxO holds, named after `grant.slot`. */
  readonly token: Cardano.AssetId;
}

/**
 * A UTxO at the account address that holds an account token but fits no
 * contract shape. The contract prevents every one of them, so each means a
 * broken assumption; Lace lists it and never spends it.
 */
export type CustodyUtxoAnomaly =
  | {
      readonly code: 'grant-datum-malformed';
      readonly utxo: Cardano.Utxo;
      readonly slot: bigint;
      readonly error: CustodyDecodeError;
    }
  /** A grant token without an inline datum: none, or only its hash. */
  | {
      readonly code: 'grant-datum-not-inline';
      readonly utxo: Cardano.Utxo;
      readonly slot: bigint;
    }
  | {
      readonly code: 'grant-slot-mismatch';
      readonly utxo: Cardano.Utxo;
      readonly slot: bigint;
      readonly datumSlot: bigint;
    }
  /** A grant token beside assets other than lovelace. */
  | {
      readonly code: 'grant-value-not-strict';
      readonly utxo: Cardano.Utxo;
      readonly slot: bigint;
    }
  /** Account tokens other than exactly one grant token of this account. */
  | {
      readonly code: 'unexpected-account-tokens';
      readonly utxo: Cardano.Utxo;
      readonly assetIds: readonly Cardano.AssetId[];
    };

/**
 * The UTxOs at an account address, by who may spend them:
 *
 * - `controls`: hold the state NFT. A live account has exactly one; more
 *   make the account invalid. Only a listed device spends it.
 * - `grants`: hold one grant token of this account and carry its grant, in
 *   slot order. The grantee spends it while the grant is current; a device
 *   sweeps it once dead.
 * - `reserves`: no account token, an inline datum. Only a device spends
 *   them. `own` carry exactly the datum `d87980` and no reference script;
 *   `foreign` carry any other datum or a reference script, which changes
 *   their fee and minimum lovelace.
 * - `funds`: no account token, no datum. Agents within their grants and
 *   devices spend them.
 * - `stranded`: no account token, a datum hash. Spending needs the datum,
 *   which the chain does not reveal.
 */
interface CustodyAccountUtxos {
  readonly controls: readonly Cardano.Utxo[];
  readonly grants: readonly CustodyGrantUtxo[];
  readonly reserves: {
    readonly own: readonly Cardano.Utxo[];
    readonly foreign: readonly Cardano.Utxo[];
  };
  readonly funds: readonly Cardano.Utxo[];
  readonly stranded: readonly Cardano.Utxo[];
  readonly anomalies: readonly CustodyUtxoAnomaly[];
}

/** The tokens of a value under a policy. */
const tokensUnder = (
  value: Cardano.Value,
  policyId: Cardano.PolicyId,
): Cardano.AssetId[] =>
  [...(value.assets?.entries() ?? [])]
    .filter(
      ([assetId, quantity]) =>
        quantity !== 0n && Cardano.AssetId.getPolicyId(assetId) === policyId,
    )
    .map(([assetId]) => assetId);

type GrantClassification =
  | { readonly anomaly: CustodyUtxoAnomaly }
  | { readonly grant: CustodyGrantUtxo };

/** Reads a UTxO that holds exactly one grant token of the account, in quantity one. */
const classifyGrant = (
  utxo: Cardano.Utxo,
  token: Cardano.AssetId,
  slot: bigint,
): GrantClassification => {
  const [, output] = utxo;
  if (output.value.assets?.size !== 1) {
    return { anomaly: { code: 'grant-value-not-strict', utxo, slot } };
  }
  if (output.datum === undefined) {
    return { anomaly: { code: 'grant-datum-not-inline', utxo, slot } };
  }
  const decoded = decodeCustodyGrant(output.datum);
  if (!decoded.ok) {
    return {
      anomaly: {
        code: 'grant-datum-malformed',
        utxo,
        slot,
        error: decoded.error,
      },
    };
  }
  if (decoded.value.slot !== slot) {
    return {
      anomaly: {
        code: 'grant-slot-mismatch',
        utxo,
        slot,
        datumSlot: decoded.value.slot,
      },
    };
  }
  return { grant: { utxo, grant: decoded.value, token } };
};

/** The grant token and its slot, when the tokens are exactly one own grant token held once. */
const ownGrantToken = (
  account: CustodyAccountLocation,
  value: Cardano.Value,
  tokens: readonly Cardano.AssetId[],
): { token: Cardano.AssetId; slot: bigint } | undefined => {
  const [token] = tokens;
  if (tokens.length !== 1 || value.assets?.get(token) !== 1n) return undefined;
  const name = parseCustodyAccountTokenName(
    Cardano.AssetId.getAssetName(token),
  );
  return name?.kind === 'grant' &&
    name.stakeScriptHash === account.stakeScriptHash
    ? { token, slot: name.slot }
    : undefined;
};

/**
 * Sorts an account's UTxOs by kind. UTxOs not at the exact account address
 * are ignored. It never throws: a UTxO that holds an account token in a
 * shape the contract rules out is listed in `anomalies`.
 */
export const classifyCustodyAccountUtxos = (
  account: CustodyAccountLocation,
  utxos: readonly Cardano.Utxo[],
): CustodyAccountUtxos => {
  const policyId = Cardano.PolicyId(account.accountValidatorHash);
  const stateNft = Cardano.AssetId.fromParts(
    policyId,
    Cardano.AssetName(account.stakeScriptHash),
  );
  const controls: Cardano.Utxo[] = [];
  const grants: CustodyGrantUtxo[] = [];
  const own: Cardano.Utxo[] = [];
  const foreign: Cardano.Utxo[] = [];
  const funds: Cardano.Utxo[] = [];
  const stranded: Cardano.Utxo[] = [];
  const anomalies: CustodyUtxoAnomaly[] = [];
  for (const utxo of utxos) {
    const [, output] = utxo;
    if (output.address !== account.address) continue;
    const tokens = tokensUnder(output.value, policyId);
    if (tokens.includes(stateNft)) {
      controls.push(utxo);
    } else if (tokens.length > 0) {
      const grantToken = ownGrantToken(account, output.value, tokens);
      if (!grantToken) {
        anomalies.push({
          code: 'unexpected-account-tokens',
          utxo,
          assetIds: tokens,
        });
        continue;
      }
      const classified = classifyGrant(utxo, grantToken.token, grantToken.slot);
      if ('grant' in classified) grants.push(classified.grant);
      else anomalies.push(classified.anomaly);
    } else if (output.datum !== undefined) {
      const isOwn =
        output.scriptReference === undefined &&
        isCustodyReserveDatum(output.datum);
      (isOwn ? own : foreign).push(utxo);
    } else if (output.datumHash === undefined) {
      funds.push(utxo);
    } else {
      stranded.push(utxo);
    }
  }
  grants.sort((a, b) =>
    a.grant.slot < b.grant.slot ? -1 : a.grant.slot > b.grant.slot ? 1 : 0,
  );
  return {
    controls,
    grants,
    reserves: { own, foreign },
    funds,
    stranded,
    anomalies,
  };
};

/**
 * Where a grant stands against a control state at a time:
 *
 * - `current`: spendable now: issued under the state's generation, its slot
 *   not revoked, not expired.
 * - `superseded`: issued under an older generation; a revoke-all killed it.
 * - `revoked`: its slot is in the revoked list.
 * - `expired`: otherwise current, but its expiry has come.
 * - `future-generation`: issued under a generation the state has not
 *   reached, so the state is older than the grant. The contract neither
 *   spends nor sweeps it against that state; judge it against a newer one.
 */
export type CustodyGrantLiveness =
  | 'current'
  | 'expired'
  | 'future-generation'
  | 'revoked'
  | 'superseded';

/**
 * The liveness of a grant against a control state at `now`. A grant dead for
 * several reasons takes the first of superseded, revoked and expired, so
 * `expired` alone means a sweep needs a validity interval that starts after
 * the expiry.
 *
 * @param now - POSIX milliseconds; a non-finite value counts as past every expiry
 */
export const custodyGrantLiveness = (
  grant: CustodyGrant,
  state: CustodyAccountState,
  now: number,
): CustodyGrantLiveness => {
  if (grant.generation < state.grantGeneration) return 'superseded';
  if (grant.generation > state.grantGeneration) return 'future-generation';
  if (!isCustodyGrantCurrent(grant, state)) return 'revoked';
  return isCustodyGrantExpired(grant, now) ? 'expired' : 'current';
};
