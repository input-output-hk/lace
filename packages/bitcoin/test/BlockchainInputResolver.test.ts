/* eslint-disable no-magic-numbers, no-loop-func, @typescript-eslint/no-non-null-assertion, unicorn/consistent-function-scoping, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, camelcase */
import { BlockchainInputResolver } from '../src/wallet/lib/providers/BlockchainInputResolver';
import { BlockchainDataProvider } from '../src/wallet/lib/providers/BitcoinDataProvider';

describe('BlockchainInputResolver', () => {
  const mockTransaction = {
    outputs: [
      { address: 'addr1', satoshis: BigInt(1000) },
      { address: 'addr2', satoshis: BigInt(2000) }
    ]
  };

  let mockProvider: BlockchainDataProvider;

  beforeEach(() => {
    mockProvider = {
      getTransaction: jest.fn()
    } as unknown as BlockchainDataProvider;
  });

  it('resolves a valid input correctly', async () => {
    (mockProvider.getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

    const resolver = new BlockchainInputResolver(mockProvider);
    const result = await resolver.resolve('tx123', 1);

    expect(result).toEqual({
      txId: 'tx123',
      index: 1,
      address: 'addr2',
      satoshis: BigInt(2000)
    });
    expect(mockProvider.getTransaction).toHaveBeenCalledWith('tx123');
  });

  it('throws error if transaction is not found', async () => {
    (mockProvider.getTransaction as jest.Mock).mockResolvedValue();

    const resolver = new BlockchainInputResolver(mockProvider);

    await expect(resolver.resolve('missingTx', 0)).rejects.toThrow('Transaction or output index not found');
  });

  it('throws error if output index is out of range', async () => {
    (mockProvider.getTransaction as jest.Mock).mockResolvedValue(mockTransaction);

    const resolver = new BlockchainInputResolver(mockProvider);

    await expect(resolver.resolve('tx123', 5)).rejects.toThrow('Transaction or output index not found');
  });
});
