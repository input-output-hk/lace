import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { Ok, Err } from '@lace-sdk/util';
import { of } from 'rxjs';
import { it, describe, expect, beforeEach, vi } from 'vitest';

import { BlockchainInputResolver } from '../../src/providers/BlockchainInputResolver';

import type { BitcoinProvider } from '@lace-contract/bitcoin-context';
import type { Mock } from 'vitest';

describe('BlockchainInputResolver', () => {
  const mockTransaction = {
    outputs: [
      { address: 'addr1', satoshis: BigInt(1000) },
      { address: 'addr2', satoshis: BigInt(2000) },
    ],
  };

  let mockProvider: BitcoinProvider;

  beforeEach(() => {
    mockProvider = {
      getTransaction: vi.fn(),
    } as unknown as BitcoinProvider;
  });

  it('resolves a valid input correctly', async () => {
    (mockProvider.getTransaction as Mock).mockImplementation(() =>
      of(Ok(mockTransaction)),
    );

    const resolver = new BlockchainInputResolver(
      mockProvider,
      BitcoinNetwork.Mainnet,
    );
    const result = await resolver.resolve('tx123', 1);

    expect(result).toEqual({
      txId: 'tx123',
      index: 1,
      address: 'addr2',
      satoshis: BigInt(2000),
      script: '',
      runes: [],
      inscriptions: [],
    });
    expect(mockProvider.getTransaction).toHaveBeenCalledWith(
      {
        network: 'mainnet',
      },
      'tx123',
    );
  });

  it('throws error if transaction is not found', async () => {
    (mockProvider.getTransaction as Mock).mockImplementation(() =>
      of(Err(mockTransaction)),
    );

    const resolver = new BlockchainInputResolver(
      mockProvider,
      BitcoinNetwork.Mainnet,
    );

    await expect(resolver.resolve('missingTx', 0)).rejects.toThrow(
      'Transaction or output index not found',
    );
  });

  it('throws error if output index is out of range', async () => {
    (mockProvider.getTransaction as Mock).mockImplementation(() =>
      of(Ok(mockTransaction)),
    );

    const resolver = new BlockchainInputResolver(
      mockProvider,
      BitcoinNetwork.Mainnet,
    );

    await expect(resolver.resolve('tx123', 5)).rejects.toThrow(
      'Transaction or output index not found',
    );
  });
});
