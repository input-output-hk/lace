import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { CardanoCustodyRequestRefusedError } from '@lace-contract/cardano-context';
import { describe, expect, it } from 'vitest';

import { readCardanoCustodyControlDevices } from '../../src/custody/read-cardano-custody-control-devices';

import {
  controlOutput,
  DEVICE_0,
  fundUtxo,
  grantedControl,
  identity,
  initialState,
  liveControl,
  PREPROD,
  RECIPIENT_ADDRESS,
  record,
  utxo,
} from './custody-fixtures';

const read = (
  overrides: Partial<Parameters<typeof readCardanoCustodyControlDevices>[0]>,
) =>
  readCardanoCustodyControlDevices({
    accountRecord: record,
    chainId: PREPROD,
    controlUtxo: liveControl,
    ...overrides,
  });

const controlWith = (txOut: Partial<Cardano.TxOut>) =>
  utxo(0x10, { ...controlOutput(initialState), ...txOut });

describe('readCardanoCustodyControlDevices', () => {
  it('reads the account address and the devices the control datum lists', () => {
    expect(read({}).unwrap()).toEqual({
      address: identity.address,
      devices: [DEVICE_0],
    });
  });

  it('accepts the record as JSON text and lists every device in lower case', () => {
    const other = 'EE'.repeat(28);
    const devices = [HexBlob(other), HexBlob(DEVICE_0.toUpperCase())];

    expect(
      read({
        accountRecord: JSON.stringify(record),
        controlUtxo: utxo(0x10, controlOutput({ ...initialState, devices })),
      }).unwrap(),
    ).toEqual({
      address: identity.address,
      devices: [other.toLowerCase(), DEVICE_0],
    });
  });

  it('reads a control UTxO whose state has issued grants', () => {
    expect(read({ controlUtxo: grantedControl }).unwrap()).toMatchObject({
      devices: [DEVICE_0],
    });
  });

  it('reads the devices from the second datum field, whatever follows it', () => {
    const datum: Cardano.PlutusData = {
      constructor: 0n,
      fields: {
        items: [
          Buffer.from(initialState.logic, 'hex'),
          { items: [Buffer.from(DEVICE_0, 'hex')] },
          7n,
        ],
      },
    };

    expect(read({ controlUtxo: controlWith({ datum }) }).unwrap()).toEqual({
      address: identity.address,
      devices: [DEVICE_0],
    });
  });

  it.each([
    [
      'a record for an unknown contract version',
      { accountRecord: { ...record, accountValidatorHash: 'cc'.repeat(28) } },
      {
        code: 'custody-unsupported-version',
        reason: 'unsupported-contract-version',
      },
    ],
    [
      'a record that does not re-derive',
      {
        accountRecord: {
          ...record,
          stakeScriptHash: Hash28ByteBase16('dd'.repeat(28)),
        },
      },
      { code: 'custody-context-mismatch', reason: 'invalid-record' },
    ],
    [
      'a record for another network',
      { chainId: Cardano.ChainIds.Preview },
      { code: 'custody-context-mismatch', reason: 'invalid-record' },
    ],
    [
      'a control UTxO at another address',
      { controlUtxo: controlWith({ address: RECIPIENT_ADDRESS }) },
      { code: 'custody-context-mismatch', reason: 'control-utxo-address' },
    ],
    [
      'a UTxO without the state NFT',
      { controlUtxo: fundUtxo },
      { code: 'custody-malformed-datum', reason: 'control-utxo-state-nft' },
    ],
    [
      'a UTxO with two state NFTs',
      {
        controlUtxo: controlWith({
          value: {
            coins: 2_000_000n,
            assets: new Map([[identity.stateNftAssetId, 2n]]),
          },
        }),
      },
      { code: 'custody-malformed-datum', reason: 'control-utxo-state-nft' },
    ],
    [
      'a control UTxO without an inline datum',
      { controlUtxo: controlWith({ datum: undefined }) },
      { code: 'custody-malformed-datum', reason: 'control-utxo-datum' },
    ],
    [
      'a datum that is not an account state',
      { controlUtxo: controlWith({ datum: 42n }) },
      { code: 'custody-malformed-datum', reason: 'control-utxo-datum' },
    ],
    [
      'a datum whose first field is a device list, not a logic',
      {
        controlUtxo: controlWith({
          datum: {
            constructor: 0n,
            fields: { items: [{ items: [Buffer.from(DEVICE_0, 'hex')] }] },
          },
        }),
      },
      { code: 'custody-malformed-datum', reason: 'control-utxo-datum' },
    ],
    [
      'a control state under a logic the SDK does not accept, though it lists the device',
      {
        controlUtxo: utxo(
          0x10,
          controlOutput({
            ...initialState,
            logic: HexBlob(
              '69baa8a8c877247028c56c8130449e186e3658d541536d168f92db3d',
            ),
          }),
        ),
      },
      { code: 'custody-unsupported-version', reason: 'unknown-logic' },
    ],
  ])('refuses %s', (_, overrides, refusal) => {
    const devices = read(overrides);

    expect(devices.isErr() && devices.error).toBeInstanceOf(
      CardanoCustodyRequestRefusedError,
    );
    expect(devices.isErr() && devices.error).toMatchObject(refusal);
  });

  it('never throws, even for a value that is not a UTxO', () => {
    const devices = read({ controlUtxo: null as unknown as Cardano.Utxo });

    expect(devices.isErr() && devices.error).toBeInstanceOf(Error);
  });
});
