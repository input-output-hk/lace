import { describe, expect, it } from 'vitest';

import { classifyTxAsNightDesignation } from '../../../src/store/helpers/night-designation-script-addresses';

import type { Cardano } from '@cardano-sdk/core';

// The classifier only does string-equality lookups against the
// registry, so tests can pass plain strings cast to the tagged type.
// Mirrors dex-script-addresses.test.ts.
const asPaymentAddress = (value: string): Cardano.PaymentAddress =>
  value as unknown as Cardano.PaymentAddress;

// Enterprise (payment-script-only) script addresses — the convention
// upstream's reference dApp + the Midnight indexer use; verified
// on-chain.
const SCRIPT_MAINNET = asPaymentAddress(
  'addr1w9e7ft4rrdd4rkdseguxr9hudfxyytm5ckh2qy0yhz7lfeg9lvhq7',
);
const SCRIPT_TESTNET = asPaymentAddress(
  'addr_test1wplxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qzjheng',
);
const USER_ADDRESS = asPaymentAddress(
  'addr1q8pnz7upedfnv92uged3hm3lm4j7hughrg2mfpwzp904gch0vxgdpz63zp6l53826f02s4p8h6u36gw43q7gj7zftpqsvkda7s',
);

const NFT_POLICY_MAINNET =
  '73e4aea31b5b51d9b0ca386196fc6a4c422f74c5aea011e4b8bdf4e5';
const NFT_POLICY_TESTNET =
  '7e69087d98fac5869eac14e13dfb6f98228c41e638aa2a59d1f85e9c';

const fakeInput = (address: Cardano.PaymentAddress): Cardano.HydratedTxIn =>
  ({
    address,
    txId: '0000000000000000000000000000000000000000000000000000000000000000' as unknown as Cardano.TransactionId,
    index: 0,
  } as Cardano.HydratedTxIn);

const fakeOutput = (address: Cardano.PaymentAddress): Cardano.TxOut => ({
  address,
  value: { coins: 1_000_000n },
});

const mintEntry = (policyIdHex: string, quantity: bigint): Cardano.TokenMap => {
  const assetId = `${policyIdHex}` as unknown as Cardano.AssetId;
  return new Map([[assetId, quantity]]);
};

describe('classifyTxAsNightDesignation', () => {
  describe('non-matches', () => {
    it('returns undefined when neither input nor output touches the script', () => {
      expect(
        classifyTxAsNightDesignation(
          [fakeInput(USER_ADDRESS)],
          [fakeOutput(USER_ADDRESS)],
        ),
      ).toBeUndefined();
    });

    it('returns undefined for empty inputs + outputs', () => {
      expect(classifyTxAsNightDesignation([], [])).toBeUndefined();
    });
  });

  describe('designate action', () => {
    it('matches mainnet script in outputs + positive NFT mint', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(USER_ADDRESS)],
        [fakeOutput(SCRIPT_MAINNET)],
        mintEntry(NFT_POLICY_MAINNET, 1n),
      );
      expect(result).toEqual({ action: 'designate' });
    });

    it('matches testnet script in outputs + positive NFT mint', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(USER_ADDRESS)],
        [fakeOutput(SCRIPT_TESTNET)],
        mintEntry(NFT_POLICY_TESTNET, 1n),
      );
      expect(result).toEqual({ action: 'designate' });
    });

    it('falls back to designate when output touches script and no mint entry present', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(USER_ADDRESS)],
        [fakeOutput(SCRIPT_MAINNET)],
      );
      expect(result).toEqual({ action: 'designate' });
    });
  });

  describe('update action', () => {
    it('matches when script is in BOTH inputs and outputs with no mint entry', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_MAINNET)],
        [fakeOutput(SCRIPT_MAINNET)],
      );
      expect(result).toEqual({ action: 'update' });
    });

    it('matches testnet update', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_TESTNET)],
        [fakeOutput(SCRIPT_TESTNET)],
      );
      expect(result).toEqual({ action: 'update' });
    });
  });

  describe('deregister action', () => {
    it('matches when script in inputs + negative NFT mint (burn)', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_MAINNET)],
        [fakeOutput(USER_ADDRESS)],
        mintEntry(NFT_POLICY_MAINNET, -1n),
      );
      expect(result).toEqual({ action: 'deregister' });
    });

    it('falls back to deregister when only input touches script (defensive)', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_MAINNET)],
        [fakeOutput(USER_ADDRESS)],
      );
      expect(result).toEqual({ action: 'deregister' });
    });
  });

  describe('mint discrimination over output presence', () => {
    it('positive mint wins over update-shape (designate not update)', () => {
      // Both inputs and outputs touch the script — would normally
      // imply update — but the positive mint entry forces designate.
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_MAINNET)],
        [fakeOutput(SCRIPT_MAINNET)],
        mintEntry(NFT_POLICY_MAINNET, 1n),
      );
      expect(result).toEqual({ action: 'designate' });
    });

    it('negative mint wins over update-shape (deregister not update)', () => {
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_MAINNET)],
        [fakeOutput(SCRIPT_MAINNET)],
        mintEntry(NFT_POLICY_MAINNET, -1n),
      );
      expect(result).toEqual({ action: 'deregister' });
    });

    it('unrelated mint (different policy id) is ignored — falls back to shape', () => {
      const otherPolicyId =
        'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
      const result = classifyTxAsNightDesignation(
        [fakeInput(SCRIPT_MAINNET)],
        [fakeOutput(SCRIPT_MAINNET)],
        mintEntry(otherPolicyId, 1n),
      );
      expect(result).toEqual({ action: 'update' });
    });
  });
});
