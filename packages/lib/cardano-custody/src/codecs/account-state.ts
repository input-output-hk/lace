// Ported from Biglup/cardano-account-custody-contract offchain/src/data.ts and
// lib/cardano_account_custody_contract/types.ak at revision
// b48545f4be850c1044de2dbeb51751718b4b8e70 (Apache-2.0). Modified for Lace:
// built on @cardano-sdk/core Plutus data, recipients stay Plutus address data,
// and decoding returns a typed result instead of throwing.

import {
  bytes,
  constr,
  decodeResult,
  expectBytes,
  expectConstr,
  expectConstrPrefix,
  expectInt,
  expectList,
  fieldPath,
  itemPath,
  list,
} from './plutus-data';
import { decodeRecipient, encodeRecipient } from './recipient';

import type { CustodyResult } from '../result';
import type { CustodyDecodeError } from './plutus-data';
import type { CustodyRecipient } from './recipient';
import type { Cardano } from '@cardano-sdk/core';
import type { HexBlob } from '@cardano-sdk/util';

/** One asset class. Lovelace is the empty policy id with the empty name. */
export interface CustodyAsset {
  readonly policyId: HexBlob;
  readonly assetName: HexBlob;
}

/**
 * The bounds of a grant. Caps limit the net outflow from the account address
 * per asset class; `cap` and `lovelaceCap` are what remains, and every grant
 * spend may only lower them.
 */
export interface CustodyScope {
  readonly asset: CustodyAsset;
  /** Most of `asset` one transaction may take. */
  readonly perCallCap: bigint;
  /** Remaining `asset` over the grant's lifetime. */
  readonly cap: bigint;
  /** Lovelace per transaction alongside a token; zero for a lovelace grant. */
  readonly lovelacePerCallCap: bigint;
  /** Remaining lovelace alongside a token; zero for a lovelace grant. */
  readonly lovelaceCap: bigint;
  /** POSIX milliseconds; the transaction's upper validity bound must not pass it. */
  readonly expiresAt: bigint;
  /** Allowed destinations; an empty list allows any address. */
  readonly recipients: readonly CustodyRecipient[];
}

/**
 * The inline datum of a grant UTxO: a revocable permission for the grantee
 * key to spend within a scope. The UTxO holds the grant token of `slot`.
 */
export interface CustodyGrant {
  /** Account-local grant identifier, not a chain slot. */
  readonly slot: bigint;
  /** Ed25519 key hash that must sign a spend as a required signer. */
  readonly grantee: HexBlob;
  /**
   * The account's grant generation at issuance. The grant dies once the
   * account's generation moves past it.
   */
  readonly generation: bigint;
  readonly scope: CustodyScope;
}

/**
 * The inline datum of an account's control UTxO: the logic that governs the
 * account, its devices and its grant bookkeeping. `logic`, `devices` and
 * `grantGeneration` are the stable prefix every logic version keeps first,
 * in this order.
 */
export interface CustodyAccountState {
  /**
   * Hash of the logic script whose rules apply to the account: the applied
   * script, not the blueprint's unapplied validator.
   */
  readonly logic: HexBlob;
  /** Key hashes with full owner authority. */
  readonly devices: readonly HexBlob[];
  /** Only grows; every grant issued under an older value is dead. */
  readonly grantGeneration: bigint;
  /** The slot the next issued grant takes. */
  readonly nextSlot: bigint;
  /** Slots of the current generation revoked one by one. */
  readonly revoked: readonly bigint[];
  /** Grant tokens minted and not yet burned, live or dead. */
  readonly outstanding: bigint;
}

const encodeAsset = (asset: CustodyAsset): Cardano.PlutusData =>
  constr(0, [bytes(asset.policyId), bytes(asset.assetName)]);

const decodeAsset = (data: Cardano.PlutusData, path: string): CustodyAsset => {
  const [policyId, assetName] = expectConstr(
    data,
    { index: 0, arity: 2 },
    { path, what: 'an asset' },
  );
  return {
    policyId: expectBytes(policyId, fieldPath(path, 'policyId'), 'a policy id'),
    assetName: expectBytes(
      assetName,
      fieldPath(path, 'assetName'),
      'an asset name',
    ),
  };
};

/** Fields in declaration order: the lovelace per call cap precedes the lovelace cap. */
const encodeScope = (scope: CustodyScope): Cardano.PlutusData =>
  constr(0, [
    encodeAsset(scope.asset),
    scope.perCallCap,
    scope.cap,
    scope.lovelacePerCallCap,
    scope.lovelaceCap,
    scope.expiresAt,
    list(scope.recipients.map(encodeRecipient)),
  ]);

const decodeScope = (data: Cardano.PlutusData, path: string): CustodyScope => {
  const [
    asset,
    perCallCap,
    cap,
    lovelacePerCallCap,
    lovelaceCap,
    expiresAt,
    recipients,
  ] = expectConstr(data, { index: 0, arity: 7 }, { path, what: 'a scope' });
  const recipientsPath = fieldPath(path, 'recipients');
  return {
    asset: decodeAsset(asset, fieldPath(path, 'asset')),
    perCallCap: expectInt(
      perCallCap,
      fieldPath(path, 'perCallCap'),
      'a per call cap',
    ),
    cap: expectInt(cap, fieldPath(path, 'cap'), 'a cap'),
    lovelacePerCallCap: expectInt(
      lovelacePerCallCap,
      fieldPath(path, 'lovelacePerCallCap'),
      'a lovelace per call cap',
    ),
    lovelaceCap: expectInt(
      lovelaceCap,
      fieldPath(path, 'lovelaceCap'),
      'a lovelace cap',
    ),
    expiresAt: expectInt(expiresAt, fieldPath(path, 'expiresAt'), 'an expiry'),
    recipients: expectList(recipients, recipientsPath, 'recipients').map(
      (recipient, index) =>
        decodeRecipient(recipient, itemPath(recipientsPath, index)),
    ),
  };
};

/**
 * The inline datum of a grant UTxO. Always fresh Plutus data, like the state
 * encoder. Throws `InvalidStringError` for a key hash, asset or credential
 * hash that is not hex of whole bytes.
 */
export const encodeCustodyGrant = (grant: CustodyGrant): Cardano.PlutusData =>
  constr(0, [
    grant.slot,
    bytes(grant.grantee),
    grant.generation,
    encodeScope(grant.scope),
  ]);

/**
 * The grant a grant UTxO datum carries. Accepts exactly the shapes the
 * logic's soft cast accepts and applies no authoring rule;
 * `findCustodyGrantViolations` marks what Lace would not author.
 */
export const decodeCustodyGrant = (
  data: Cardano.PlutusData,
): CustodyResult<CustodyGrant, CustodyDecodeError> =>
  decodeResult(() => {
    const [slot, grantee, generation, scope] = expectConstr(
      data,
      { index: 0, arity: 4 },
      { path: '', what: 'a grant' },
    );
    return {
      slot: expectInt(slot, 'slot', 'a slot'),
      grantee: expectBytes(grantee, 'grantee', 'a grantee key hash'),
      generation: expectInt(generation, 'generation', 'a generation'),
      scope: decodeScope(scope, 'scope'),
    };
  });

/**
 * The control UTxO datum for a state. Always fresh Plutus data, so edits made
 * to a decoded state are never masked by the original encoding.
 *
 * Throws `InvalidStringError` for a logic or device key hash that is not hex
 * of whole bytes, instead of writing other bytes than the state holds. A
 * decoded state, and a state `findCustodyStateViolations` accepts, always
 * encode.
 */
export const encodeCustodyAccountState = (
  state: CustodyAccountState,
): Cardano.PlutusData =>
  constr(0, [
    bytes(state.logic),
    list(state.devices.map(device => bytes(device))),
    state.grantGeneration,
    state.nextSlot,
    list([...state.revoked]),
    state.outstanding,
  ]);

const decodeLogic = (data: Cardano.PlutusData): HexBlob =>
  expectBytes(data, 'logic', 'a logic hash');

const decodeDevices = (data: Cardano.PlutusData): HexBlob[] =>
  expectList(data, 'devices', 'devices').map((device, index) =>
    expectBytes(device, itemPath('devices', index), 'a device key hash'),
  );

/**
 * The state a control UTxO datum carries. Accepts exactly the shapes the
 * logic's soft cast accepts: canonical constructor indices and exact
 * field counts. It applies no authoring rule, so an on-chain device with an
 * ill-sized hash still decodes; `findCustodyStateViolations` marks it.
 */
export const decodeCustodyAccountState = (
  data: Cardano.PlutusData,
): CustodyResult<CustodyAccountState, CustodyDecodeError> =>
  decodeResult(() => {
    const [logic, devices, grantGeneration, nextSlot, revoked, outstanding] =
      expectConstr(
        data,
        { index: 0, arity: 6 },
        { path: '', what: 'an account state' },
      );
    return {
      logic: decodeLogic(logic),
      devices: decodeDevices(devices),
      grantGeneration: expectInt(
        grantGeneration,
        'grantGeneration',
        'a grant generation',
      ),
      nextSlot: expectInt(nextSlot, 'nextSlot', 'a next slot'),
      revoked: expectList(revoked, 'revoked', 'revoked slots').map(
        (slot, index) =>
          expectInt(slot, itemPath('revoked', index), 'a revoked slot'),
      ),
      outstanding: expectInt(
        outstanding,
        'outstanding',
        'an outstanding count',
      ),
    };
  });

/**
 * The logic hash a control UTxO datum names in its first field, whatever the
 * field count, as the proxy reads it.
 */
export const decodeCustodyStateLogic = (
  data: Cardano.PlutusData,
): CustodyResult<HexBlob, CustodyDecodeError> =>
  decodeResult(() => {
    const [logic] = expectConstrPrefix(
      data,
      { index: 0, minArity: 1 },
      { path: '', what: 'an account state' },
    );
    return decodeLogic(logic);
  });

/**
 * The device key hashes of a control UTxO datum, read from its second field
 * whatever the field count, as the stake script reads them. The devices are
 * only as trustworthy as the logic that admitted them, so a reader first
 * checks the logic `decodeCustodyStateLogic` names.
 */
export const decodeCustodyStateDevices = (
  data: Cardano.PlutusData,
): CustodyResult<HexBlob[], CustodyDecodeError> =>
  decodeResult(() => {
    const [, devices] = expectConstrPrefix(
      data,
      { index: 0, minArity: 2 },
      { path: '', what: 'an account state' },
    );
    return decodeDevices(devices);
  });
