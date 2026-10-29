// Ported from Biglup/cardano-account-custody-contract offchain/src/data.ts and
// lib/cardano_account_custody_contract/types.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// built on @cardano-sdk/core Plutus data, and decoding returns a typed result
// instead of throwing.

import {
  constr,
  decodeResult,
  expectConstr,
  expectConstrIndex,
  unknownAlternative,
} from './plutus-data';

import type { CustodyResult } from '../result';
import type { CustodyDecodeError } from './plutus-data';
import type { Cardano } from '@cardano-sdk/core';

/**
 * The account proxy's spend redeemer. `device` is the owner path on the
 * control UTxO, `spendWithGrant` the agent path on a grant UTxO,
 * `sweepGrant` the owner path on a dead grant UTxO, and `fund` spends a
 * deposit at the account address beside an account token spent alongside.
 */
export type CustodyAccountRedeemer = {
  readonly kind: 'device' | 'fund' | 'spendWithGrant' | 'sweepGrant';
};

/**
 * The account proxy's mint redeemer. `createAccount` mints the state
 * NFT, `issueGrants` mints grant tokens and `burnGrants` burns the tokens of
 * swept grants.
 */
export type CustodyMintRedeemer = {
  readonly kind: 'burnGrants' | 'createAccount' | 'issueGrants';
};

/** Constructor order of `AccountRedeemer`; no constructor has fields. */
const ACCOUNT_REDEEMER_KINDS: readonly CustodyAccountRedeemer['kind'][] = [
  'device',
  'spendWithGrant',
  'sweepGrant',
  'fund',
];

/** Constructor order of `MintRedeemer`; no constructor has fields. */
const MINT_REDEEMER_KINDS: readonly CustodyMintRedeemer['kind'][] = [
  'createAccount',
  'issueGrants',
  'burnGrants',
];

/** Decodes a union whose constructors all have no fields. */
const decodeFieldless = <Kind extends string>(
  data: Cardano.PlutusData,
  kinds: readonly Kind[],
  what: string,
): CustodyResult<{ readonly kind: Kind }, CustodyDecodeError> =>
  decodeResult(() => {
    const index = expectConstrIndex(data, '', what);
    const kind = kinds[Number(index)];
    if (kind === undefined) {
      return unknownAlternative('', `${what} of ${kinds.join(', ')}`, index);
    }
    expectConstr(data, { index: Number(index), arity: 0 }, { path: '', what });
    return { kind };
  });

/** `Device` is constructor 0, `SpendWithGrant` 1, `SweepGrant` 2 and `Fund` 3. */
export const encodeCustodyAccountRedeemer = ({
  kind,
}: CustodyAccountRedeemer): Cardano.PlutusData =>
  constr(ACCOUNT_REDEEMER_KINDS.indexOf(kind));

export const decodeCustodyAccountRedeemer = (
  data: Cardano.PlutusData,
): CustodyResult<CustodyAccountRedeemer, CustodyDecodeError> =>
  decodeFieldless(data, ACCOUNT_REDEEMER_KINDS, 'an account redeemer');

/** `CreateAccount` is constructor 0, `IssueGrants` 1 and `BurnGrants` 2. */
export const encodeCustodyMintRedeemer = ({
  kind,
}: CustodyMintRedeemer): Cardano.PlutusData =>
  constr(MINT_REDEEMER_KINDS.indexOf(kind));

export const decodeCustodyMintRedeemer = (
  data: Cardano.PlutusData,
): CustodyResult<CustodyMintRedeemer, CustodyDecodeError> =>
  decodeFieldless(data, MINT_REDEEMER_KINDS, 'a mint redeemer');

/** `Operate`: constructor 0 with no fields. */
export const encodeCustodyStakeRedeemer = (): Cardano.PlutusData => constr(0);

/**
 * `Run`, the redeemer of a logic script's withdraw and publish handlers:
 * constructor 0 with no fields.
 */
export const encodeCustodyLogicRedeemer = (): Cardano.PlutusData => constr(0);
