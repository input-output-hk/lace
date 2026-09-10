import { describe, expect, it } from 'vitest';

import { planAccountMapping } from '../../../src/store/helpers/plan-account-mapping';

import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { AnyWallet } from '@lace-contract/wallet-repo';

const NETWORK = 'cardano-preprod' as unknown;

const address = (accountIndex: number, suffix: string): GroupedAddress =>
  ({
    accountIndex,
    address: `addr_test1_${accountIndex}_${suffix}`,
  } as unknown as GroupedAddress);

const utxo = (
  addr: GroupedAddress,
  coins: bigint,
  assetIds: string[] = [],
): Cardano.Utxo =>
  [
    { address: addr.address },
    {
      address: addr.address,
      value: {
        coins,
        assets: new Map(assetIds.map(id => [id, 1n])),
      },
    },
  ] as unknown as Cardano.Utxo;

const destinationWallet = (cardanoIndexes: number[]): AnyWallet =>
  ({
    walletId: 'dest',
    accounts: cardanoIndexes.map(accountIndex => ({
      blockchainName: 'Cardano',
      blockchainNetworkId: NETWORK,
      blockchainSpecific: { accountIndex },
    })),
  } as unknown as AnyWallet);

describe('planAccountMapping', () => {
  it('partitions the flat set per source account and plans fresh-wallet rows from 0', () => {
    const a0 = address(0, 'a');
    const a2 = address(2, 'a');
    const mapping = planAccountMapping({
      utxos: [
        utxo(a0, 3_000_000n, ['policy.tokenA']),
        utxo(a2, 5_000_000n),
        utxo(a2, 1_000_000n, ['policy.tokenB', 'policy.tokenC']),
      ],
      addresses: [a0, a2],
      destinationWallet: undefined,
      isExistingDestination: false,
      blockchainNetworkId: NETWORK,
    });
    expect(mapping).toEqual([
      {
        sourceAccountIndex: 0,
        destinationAccountIndex: 0,
        coin: '3000000',
        assetCount: 1,
        utxoCount: 1,
      },
      {
        sourceAccountIndex: 2,
        destinationAccountIndex: 1,
        coin: '6000000',
        assetCount: 2,
        utxoCount: 2,
      },
    ]);
  });

  // Candidates start at the wallet's FIRST account: an account already loaded
  // that has never touched the chain is the target we want, and the on-chain
  // freshness probe advances past any candidate it finds used. Index arithmetic
  // alone cannot tell them apart, so it no longer tries.
  it('starts an existing destination at its lowest Cardano account', () => {
    const a0 = address(0, 'a');
    const mapping = planAccountMapping({
      utxos: [utxo(a0, 2_000_000n)],
      addresses: [a0],
      destinationWallet: destinationWallet([0, 3]),
      isExistingDestination: true,
      blockchainNetworkId: NETWORK,
    });
    expect(mapping).toEqual([
      {
        sourceAccountIndex: 0,
        destinationAccountIndex: 0,
        coin: '2000000',
        assetCount: 0,
        utxoCount: 1,
      },
    ]);
  });

  // A hardware destination cannot derive accounts without a device ceremony,
  // so planning fresh indices for it produced a plan the sweep could not
  // execute: it threw "no encrypted root" after the user had confirmed.
  it('lands every row in the picked account when the destination cannot create accounts', () => {
    const a0 = address(0, 'a');
    const a1 = address(1, 'a');
    const mapping = planAccountMapping({
      utxos: [utxo(a0, 3_000_000n), utxo(a1, 2_000_000n)],
      addresses: [a0, a1],
      destinationWallet: destinationWallet([0, 5]),
      isExistingDestination: true,
      blockchainNetworkId: NETWORK,
      fixedDestinationAccountIndex: 5,
    });
    expect(mapping.map(row => row.destinationAccountIndex)).toEqual([5, 5]);
  });

  it('includes a rewards-only account (addresses, no UTxOs) so its withdrawal has a planned home', () => {
    const a0 = address(0, 'a');
    const a1 = address(1, 'a');
    const mapping = planAccountMapping({
      utxos: [utxo(a0, 2_000_000n)],
      addresses: [a0, a1],
      destinationWallet: undefined,
      isExistingDestination: false,
      blockchainNetworkId: NETWORK,
    });
    expect(mapping).toHaveLength(2);
    expect(mapping[1]).toEqual({
      sourceAccountIndex: 1,
      destinationAccountIndex: 1,
      coin: '0',
      assetCount: 0,
      utxoCount: 0,
    });
  });
});
