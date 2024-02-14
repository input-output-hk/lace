import { Wallet } from '@lace/cardano';
import { createHistoricalOwnInputResolver } from '../own-input-resolver';

describe('createHistoricalOwnInputResolver', () => {
  it('should resolve input correctly when matching transaction and address are found', async () => {
    const mockTx = {
      id: 'id',
      body: { outputs: [{ address: 'address', value: 1 }] }
    } as unknown as Wallet.Cardano.HydratedTx;
    const mockGroupedAddress = { address: 'address' } as unknown as Wallet.KeyManagement.GroupedAddress;
    const resolver = createHistoricalOwnInputResolver({
      addresses: [mockGroupedAddress],
      transactions: { history: [mockTx] }
    });

    const result = await resolver.resolveInput({ txId: mockTx.id, index: 0 });
    expect(result).toEqual(mockTx.body.outputs[0]);
  });

  it('should return null when no matching transaction is found', async () => {
    const mockTx = {
      id: 'id',
      body: { outputs: [{ address: 'address', value: 1 }] }
    } as unknown as Wallet.Cardano.HydratedTx;
    const mockGroupedAddress = { address: 'address' } as unknown as Wallet.KeyManagement.GroupedAddress;
    const resolver = createHistoricalOwnInputResolver({
      addresses: [mockGroupedAddress],
      transactions: { history: [mockTx] }
    });

    const result = await resolver.resolveInput({ txId: 'id2' as unknown as Wallet.Cardano.TransactionId, index: 0 });

    expect(result).toBeNull();
  });

  it('should return null when no matching index is found', async () => {
    const mockTx = {
      id: 'id',
      body: { outputs: [{ address: 'address', value: 1 }] }
    } as unknown as Wallet.Cardano.HydratedTx;
    const mockGroupedAddress = { address: 'address' } as unknown as Wallet.KeyManagement.GroupedAddress;
    const resolver = createHistoricalOwnInputResolver({
      addresses: [mockGroupedAddress],
      transactions: { history: [mockTx] }
    });

    const result = await resolver.resolveInput({ txId: mockTx.id, index: 1 });

    expect(result).toBeNull();
  });

  it('should return null when no matching address is found in the transaction', async () => {
    const mockTx = {
      id: 'id',
      body: { outputs: [{ address: 'address', value: 1 }] }
    } as unknown as Wallet.Cardano.HydratedTx;
    const mockGroupedAddress = { address: 'otherAddress' } as unknown as Wallet.KeyManagement.GroupedAddress;
    const resolver = createHistoricalOwnInputResolver({
      addresses: [mockGroupedAddress],
      transactions: { history: [mockTx] }
    });

    const result = await resolver.resolveInput({ txId: mockTx.id, index: 0 });

    expect(result).toBeNull();
  });
});
