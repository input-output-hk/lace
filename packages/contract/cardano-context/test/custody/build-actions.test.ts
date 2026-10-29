import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  Bip32PublicKeyHex,
  Ed25519KeyHashHex,
  Hash28ByteBase16,
} from '@cardano-sdk/crypto';
import { AccountId } from '@lace-contract/wallet-repo';
import { ACCOUNT_VALIDATOR_HASH } from '@lace-lib/cardano-custody';
import { Serializable } from '@lace-lib/util-store';
import { describe, expect, it } from 'vitest';

import { cardanoCustodyActions } from '../../src';
import {
  custodyAddress as address,
  custodyCreatorKeyHash,
  custodyStakeScriptHash,
} from '../custody-mocks';

import type {
  CardanoCustodyAccountOperation,
  CardanoCustodyBuildError,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
  CardanoCustodyCreatorIndexProbeError,
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
} from '../../src';

const { cardanoCustody: actions } = cardanoCustodyActions;

const utxo: Cardano.Utxo = [
  { txId: Cardano.TransactionId('11'.repeat(32)), index: 0, address },
  { address, value: { coins: 5_000_000n } },
];

/** What a payload looks like after a JSON round trip, as across a port. */
const throughJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('custody build actions', () => {
  it('carries a request with bigints and UTxOs under a plain request id', () => {
    const request: CardanoCustodyBuildRequest = {
      requestId: 'create-1',
      operation: {
        type: 'create',
        deviceAccountPublicKey: Bip32PublicKeyHex('ab'.repeat(64)),
      },
      funding: {
        mode: 'fee',
        feeUtxo: utxo,
        collateralUtxo: utxo,
        sponsorAddress: address,
        maxSponsoredLovelace: 6_000_000n,
        validUntil: 1_800_000_000_000,
      },
    };
    const { type, payload } = actions.buildCustodyTransaction(request);

    expect(type).toBe('cardanoCustody/buildCustodyTransaction');
    expect(payload.requestId).toBe('create-1');
    expect(Serializable.from(throughJson(payload.request))).toEqual(request);
  });

  it.each<CardanoCustodyAccountOperation>([
    {
      type: 'grant-spend',
      grantee: Ed25519KeyHashHex('a1'.repeat(28)),
      outputs: [{ address, value: { coins: 2_000_000n } }],
      slot: 3n,
      feeBound: 1_000_000n,
      excludedInputs: [utxo[0]],
    },
    { type: 'sweep-grants', slots: [0n, 4_294_967_295n] },
  ])('carries an account operation request ($type)', operation => {
    const request: CardanoCustodyBuildRequest = {
      requestId: 'operation-1',
      accountId: AccountId('custody'),
      operation,
      funding: {
        mode: 'collateral',
        collateralUtxo: utxo,
        sponsorAddress: address,
        validUntil: 1_800_000_000_000,
      },
    };
    expect(
      Serializable.from(
        throughJson(actions.buildCustodyTransaction(request).payload.request),
      ),
    ).toEqual(request);
  });

  it('carries a result under its request id', () => {
    const result: CardanoCustodyBuildResult = {
      transaction: Serialization.TxCBOR('84a0a0f5f6'),
      bodyHash: Cardano.TransactionId('22'.repeat(32)),
      resolvedInputs: [utxo],
      accountRecord: {
        type: 'cardano-custody-account',
        version: 1,
        networkMagic: Cardano.NetworkMagics.Preprod,
        accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
        creatorKeyHash: custodyCreatorKeyHash,
        stakeScriptHash: custodyStakeScriptHash,
        address,
      },
      fee: 400_000n,
      invalidHereafter: Cardano.Slot(1000),
    };
    const { type, payload } = actions.buildCustodyTransactionCompleted({
      requestId: 'create-1',
      result,
    });

    expect(type).toBe('cardanoCustody/buildCustodyTransactionCompleted');
    expect(payload.requestId).toBe('create-1');
    expect(Serializable.from(throughJson(payload.result))).toEqual(result);
  });

  it.each<CardanoCustodyBuildError>([
    {
      code: 'sponsor-limit',
      sponsoredLovelace: 7_000_000n,
      maxSponsoredLovelace: 6_000_000n,
    },
    {
      code: 'grant-spend',
      reason: 'fee-above-bound',
      fee: 1_600_000n,
      feeBound: 1_500_000n,
    },
    {
      code: 'grant-spend',
      reason: 'ambiguous-grant',
      grantee: Ed25519KeyHashHex('cd'.repeat(28)),
      slots: [0n, 3n],
    },
  ])('carries a typed failure under its request id ($code)', error => {
    const { type, payload } = actions.buildCustodyTransactionFailed({
      requestId: 'create-1',
      error,
    });

    expect(type).toBe('cardanoCustody/buildCustodyTransactionFailed');
    expect(payload.requestId).toBe('create-1');
    expect(Serializable.from(throughJson(payload.error))).toEqual(error);
  });

  it('carries a creator index probe and its answers as plain JSON', () => {
    const request: CardanoCustodyCreatorIndexProbeRequest = {
      requestId: 'probe-1',
      accountValidatorHash: Hash28ByteBase16('05'.repeat(28)),
      deviceAccountPublicKey: Bip32PublicKeyHex('ab'.repeat(64)),
      creatorIndex: 3,
    };
    const result: CardanoCustodyCreatorIndexProbeResult = {
      accountValidatorHash: request.accountValidatorHash,
      creatorIndex: 3,
      status: 'pre-registered',
    };
    const error: CardanoCustodyCreatorIndexProbeError = {
      code: 'unsupported-contract-version',
      accountValidatorHash: '06'.repeat(28),
    };

    const probed = actions.probeCustodyCreatorIndex(request);
    const completed = actions.probeCustodyCreatorIndexCompleted({
      requestId: 'probe-1',
      result,
    });
    const failed = actions.probeCustodyCreatorIndexFailed({
      requestId: 'probe-1',
      error,
    });

    expect(probed.type).toBe('cardanoCustody/probeCustodyCreatorIndex');
    expect(throughJson(probed.payload)).toEqual(request);
    expect(completed.type).toBe(
      'cardanoCustody/probeCustodyCreatorIndexCompleted',
    );
    expect(throughJson(completed.payload)).toEqual({
      requestId: 'probe-1',
      result,
    });
    expect(failed.type).toBe('cardanoCustody/probeCustodyCreatorIndexFailed');
    expect(throughJson(failed.payload)).toEqual({
      requestId: 'probe-1',
      error,
    });
  });
});
