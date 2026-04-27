import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { AccountId } from '@lace-contract/wallet-repo';
import { describe, expect, it } from 'vitest';

import { CardanoPaymentAddress, CardanoRewardAccount } from '../../../src';
import {
  extractOwnedPaymentCredentials,
  extractPaymentCredential,
  filterFrankenUtxos,
} from '../../../src/store/helpers/filter-franken-utxos';

import type { CardanoAddressData } from '../../../src';
import type * as Crypto from '@cardano-sdk/crypto';
import type { Address, AnyAddress } from '@lace-contract/addresses';

// Test addresses with known payment credentials
const LEGITIMATE_ADDRESS_1 = CardanoPaymentAddress(
  'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
);

const LEGITIMATE_ADDRESS_2 = CardanoPaymentAddress(
  'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
);

// Franken address - different payment credential
// This address has a different payment credential than the legitimate addresses above
const FRANKEN_ADDRESS = CardanoPaymentAddress(
  'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
);

const accountId = AccountId('test-account-1');

const createMockAddress = (
  address: Address,
): AnyAddress<CardanoAddressData> => ({
  address,
  accountId,
  blockchainName: 'Cardano',
  data: {
    accountIndex: 0,
    networkId: 0,
    networkMagic: Cardano.NetworkMagics.Preprod,
    rewardAccount: CardanoRewardAccount(
      'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
    ),
    index: 0,
    stakeKeyDerivationPath: { index: 0, role: 2 },
    type: AddressType.External,
  },
});

const createMockUtxo = (address: string): Cardano.Utxo => [
  {
    address: Cardano.PaymentAddress(address),
    txId: Cardano.TransactionId(
      '0000000000000000000000000000000000000000000000000000000000000000',
    ),
    index: 0,
  },
  {
    address: Cardano.PaymentAddress(address),
    value: {
      coins: BigInt(1_000_000),
      assets: new Map(),
    },
  },
];

describe('extractPaymentCredential', () => {
  it('extracts payment credential from base address string', () => {
    const credential = extractPaymentCredential(LEGITIMATE_ADDRESS_1);
    expect(credential).toBeDefined();
    expect(credential).toHaveProperty('hash');
    expect(credential).toHaveProperty('type');
    expect(typeof credential?.hash).toBe('string');
    expect(credential?.type).toBe(Cardano.CredentialType.KeyHash);
  });

  it('extracts payment credential from base address object', () => {
    const addressObject = Cardano.Address.fromBech32(LEGITIMATE_ADDRESS_1);
    const credential = extractPaymentCredential(addressObject);
    expect(credential).toBeDefined();
    expect(credential).toHaveProperty('hash');
    expect(credential).toHaveProperty('type');
    expect(credential?.type).toBe(Cardano.CredentialType.KeyHash);
  });

  it('extracts same credential from same address regardless of input format', () => {
    const fromString = extractPaymentCredential(LEGITIMATE_ADDRESS_1);
    const fromObject = extractPaymentCredential(
      Cardano.Address.fromBech32(LEGITIMATE_ADDRESS_1),
    );
    expect(fromString?.hash).toBe(fromObject?.hash);
    expect(fromString?.type).toBe(fromObject?.type);
  });

  it('extracts different credentials from different addresses', () => {
    const credential1 = extractPaymentCredential(LEGITIMATE_ADDRESS_1);
    const credential2 = extractPaymentCredential(LEGITIMATE_ADDRESS_2);
    expect(credential1?.hash).not.toBe(credential2?.hash);
  });

  it('returns undefined for invalid address', () => {
    const credential = extractPaymentCredential('invalid_address');
    expect(credential).toBeUndefined();
  });
});

describe('extractOwnedPaymentCredentials', () => {
  it('extracts credentials from multiple addresses', () => {
    const addresses = [
      createMockAddress(LEGITIMATE_ADDRESS_1),
      createMockAddress(LEGITIMATE_ADDRESS_2),
    ];

    const credentials = extractOwnedPaymentCredentials(addresses);

    expect(credentials.size).toBe(2);
    expect(credentials instanceof Set).toBe(true);
  });

  it('handles duplicate addresses correctly', () => {
    const addresses = [
      createMockAddress(LEGITIMATE_ADDRESS_1),
      createMockAddress(LEGITIMATE_ADDRESS_1),
      createMockAddress(LEGITIMATE_ADDRESS_2),
    ];

    const credentials = extractOwnedPaymentCredentials(addresses);

    // Set should deduplicate
    expect(credentials.size).toBe(2);
  });

  it('returns empty Set for empty address array', () => {
    const credentials = extractOwnedPaymentCredentials([]);

    expect(credentials.size).toBe(0);
    expect(credentials instanceof Set).toBe(true);
  });

  it('returns Set with valid credentials', () => {
    const addresses = [createMockAddress(LEGITIMATE_ADDRESS_1)];
    const credentials = extractOwnedPaymentCredentials(addresses);

    expect(credentials.size).toBe(1);
    const credentialArray = Array.from(credentials);
    expect(typeof credentialArray[0]).toBe('string');
    expect(credentialArray[0].length).toBeGreaterThan(0);
  });
});

describe('filterFrankenUtxos', () => {
  it('returns all UTxOs as legitimate when all match owned credentials', () => {
    const addresses = [
      createMockAddress(LEGITIMATE_ADDRESS_1),
      createMockAddress(LEGITIMATE_ADDRESS_2),
    ];
    const ownedCredentials = extractOwnedPaymentCredentials(addresses);

    const utxos = [
      createMockUtxo(LEGITIMATE_ADDRESS_1),
      createMockUtxo(LEGITIMATE_ADDRESS_2),
    ];

    const result = filterFrankenUtxos(utxos, ownedCredentials);

    expect(result.legitimate).toHaveLength(2);
    expect(result.franken).toHaveLength(0);
    expect(result.legitimate).toEqual(utxos);
  });

  it('filters out all UTxOs as franken when none match owned credentials', () => {
    const addresses = [createMockAddress(LEGITIMATE_ADDRESS_1)];
    const ownedCredentials = extractOwnedPaymentCredentials(addresses);

    const utxos = [
      createMockUtxo(FRANKEN_ADDRESS),
      createMockUtxo(LEGITIMATE_ADDRESS_2),
    ];

    const result = filterFrankenUtxos(utxos, ownedCredentials);

    expect(result.legitimate).toHaveLength(0);
    expect(result.franken).toHaveLength(2);
    expect(result.franken).toEqual(utxos);
  });

  it('correctly partitions mixed legitimate and franken UTxOs', () => {
    const addresses = [
      createMockAddress(LEGITIMATE_ADDRESS_1),
      createMockAddress(LEGITIMATE_ADDRESS_2),
    ];
    const ownedCredentials = extractOwnedPaymentCredentials(addresses);

    const legitimateUtxo1 = createMockUtxo(LEGITIMATE_ADDRESS_1);
    const frankenUtxo = createMockUtxo(FRANKEN_ADDRESS);
    const legitimateUtxo2 = createMockUtxo(LEGITIMATE_ADDRESS_2);

    const utxos = [legitimateUtxo1, frankenUtxo, legitimateUtxo2];

    const result = filterFrankenUtxos(utxos, ownedCredentials);

    expect(result.legitimate).toHaveLength(2);
    expect(result.franken).toHaveLength(1);
    expect(result.legitimate).toContain(legitimateUtxo1);
    expect(result.legitimate).toContain(legitimateUtxo2);
    expect(result.franken).toContain(frankenUtxo);
  });

  it('filters all UTxOs when owned credentials set is empty', () => {
    const emptyCredentials = new Set<Crypto.Ed25519KeyHashHex>();

    const utxos = [
      createMockUtxo(LEGITIMATE_ADDRESS_1),
      createMockUtxo(LEGITIMATE_ADDRESS_2),
    ];

    const result = filterFrankenUtxos(utxos, emptyCredentials);

    expect(result.legitimate).toHaveLength(0);
    expect(result.franken).toHaveLength(2);
  });

  it('handles empty UTxO array', () => {
    const addresses = [createMockAddress(LEGITIMATE_ADDRESS_1)];
    const ownedCredentials = extractOwnedPaymentCredentials(addresses);

    const result = filterFrankenUtxos([], ownedCredentials);

    expect(result.legitimate).toHaveLength(0);
    expect(result.franken).toHaveLength(0);
  });

  it('maintains UTxO order for legitimate UTxOs', () => {
    const addresses = [
      createMockAddress(LEGITIMATE_ADDRESS_1),
      createMockAddress(LEGITIMATE_ADDRESS_2),
    ];
    const ownedCredentials = extractOwnedPaymentCredentials(addresses);

    const utxo1 = createMockUtxo(LEGITIMATE_ADDRESS_1);
    const utxo2 = createMockUtxo(LEGITIMATE_ADDRESS_2);
    const utxos = [utxo1, utxo2];

    const result = filterFrankenUtxos(utxos, ownedCredentials);

    expect(result.legitimate[0]).toBe(utxo1);
    expect(result.legitimate[1]).toBe(utxo2);
  });
});
