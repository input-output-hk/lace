import { createHash } from 'node:crypto';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { describe, expect, it } from 'vitest';

import { CURRENT_CUSTODY_CONTRACT_VERSION } from '../src';
import { applyStakeValidatorToOwner } from '../src/stake-script';

import { blazeApply } from './blaze-apply';
import {
  OWNER_STAKE_SCRIPT_HASH,
  PREPROD_OWNER,
  PREPROD_STAKE_SCRIPT_HASH,
} from './fixtures';

import type { CustodyContractVersion } from '../src';

const version = CURRENT_CUSTODY_CONTRACT_VERSION;

const scriptHash = (compiledCode: string): string =>
  Serialization.Script.fromCore({
    __type: Cardano.ScriptType.Plutus,
    bytes: HexBlob(compiledCode),
    version: Cardano.PlutusLanguageVersion.V3,
  }).hash();

const sha256 = (hex: string): string =>
  createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');

const applied = (owner: string): string =>
  applyStakeValidatorToOwner(version, owner);

/** A deterministic, well-spread sequence of 28-byte owners. */
const pseudoRandomOwner = (index: number): string =>
  createHash('sha256')
    .update(`custody-owner-${index}`)
    .digest('hex')
    .slice(0, 56);

describe('applyStakeValidatorToOwner', () => {
  // Pinned upstream in offchain/test/stake-script.test.ts, produced with
  // `aiken blueprint apply` from the vendored blueprint.
  it('reproduces the Aiken CLI vectors for owner aa×28', () => {
    const compiledCode = applied('aa'.repeat(28));
    expect(sha256(compiledCode)).toBe(
      'a34a30b8b9025f789c2b8386f3f73b770af9768529ace791ed435be9fb22b8d1',
    );
    expect(scriptHash(compiledCode)).toBe(OWNER_STAKE_SCRIPT_HASH);
  });

  it('reproduces the stake credential of the Preprod creator', () => {
    expect(scriptHash(applied(PREPROD_OWNER))).toBe(PREPROD_STAKE_SCRIPT_HASH);
  });

  it('matches @blaze-cardano/uplc applyParams for 200 owners', () => {
    const { compiledCode } = version.unappliedStakeValidator;
    for (let index = 0; index < 200; index++) {
      const owner = pseudoRandomOwner(index);
      expect(applied(owner)).toBe(
        blazeApply(compiledCode, owner, version.accountValidatorHash),
      );
    }
  });

  it('agrees with the oracle on the upstream one-parameter vector', () => {
    expect(
      scriptHash(
        blazeApply(
          version.unappliedStakeValidator.compiledCode,
          'aa'.repeat(28),
        ),
      ),
    ).toBe('a8b42d69bd1bdd24ecf0c92613f85a126941b6907f2dea2930284da1');
  });

  it('places the owner at bytes 1219-1246 of a 1283-byte script', () => {
    const first = Buffer.from(applied('aa'.repeat(28)), 'hex');
    const second = Buffer.from(applied('bb'.repeat(28)), 'hex');
    expect(first).toHaveLength(1283);
    expect(first.subarray(0, 3).toString('hex')).toBe('590500');
    expect(first.subarray(1213, 1219).toString('hex')).toBe('0313011e581c');
    expect(first.subarray(0, 1219)).toEqual(second.subarray(0, 1219));
    expect(first.subarray(1247)).toEqual(second.subarray(1247));
    expect(first.subarray(1219, 1247).toString('hex')).toBe('aa'.repeat(28));
    expect(first.subarray(1253, 1281).toString('hex')).toBe(
      version.accountValidatorHash,
    );
    expect(first.subarray(1281).toString('hex')).toBe('0001');
  });
});

describe('applyStakeValidatorToOwner for another contract version', () => {
  const owner = 'aa'.repeat(28);
  let nextVersion = 0;

  /**
   * A version with its own account proxy hash, so each case builds its own
   * applied-script template instead of reusing a memoised one.
   */
  const versionWith = (
    changes: Partial<CustodyContractVersion['unappliedStakeValidator']>,
  ): CustodyContractVersion => ({
    ...version,
    accountValidatorHash: Hash28ByteBase16(
      pseudoRandomOwner(1_000 + nextVersion++),
    ),
    unappliedStakeValidator: { ...version.unappliedStakeValidator, ...changes },
  });

  it('applies the version account proxy hash as the second parameter', () => {
    const other = versionWith({});
    expect(applyStakeValidatorToOwner(other, owner)).toBe(
      blazeApply(
        version.unappliedStakeValidator.compiledCode,
        owner,
        other.accountValidatorHash,
      ),
    );
  });

  it('refuses a body length the trailing filler contradicts', () => {
    for (const bodyBitLength of [9654, 9655, 9664]) {
      expect(() =>
        applyStakeValidatorToOwner(versionWith({ bodyBitLength }), owner),
      ).toThrow(`not ${bodyBitLength} bits followed by a filler`);
    }
  });

  it('depends on the pinned body length where the filler is ambiguous', () => {
    // The final byte 0x01 admits bodies of 9656 to 9663 bits; only the
    // pinned length reproduces what a full UPLC decode and apply produces.
    for (const bodyBitLength of [9656, 9657, 9659, 9663]) {
      const other = versionWith({ bodyBitLength });
      expect(applyStakeValidatorToOwner(other, owner)).not.toBe(
        blazeApply(
          version.unappliedStakeValidator.compiledCode,
          owner,
          other.accountValidatorHash,
        ),
      );
    }
  });

  it('refuses a program that is not version 1.1.0', () => {
    const compiledCode = version.unappliedStakeValidator.compiledCode;
    // Header 5904bb, then the version bytes 01 01 00.
    const version120 = HexBlob(
      `${compiledCode.slice(0, 8)}02${compiledCode.slice(10)}`,
    );
    expect(() =>
      applyStakeValidatorToOwner(
        versionWith({ compiledCode: version120 }),
        owner,
      ),
    ).toThrow('not a version 1.1.0 program');
  });
});
