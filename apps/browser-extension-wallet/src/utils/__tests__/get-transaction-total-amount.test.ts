/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { getTransactionTotalAmount } from '../get-transaction-total-amount';
import BigNumber from 'bignumber.js';

describe('getTransactionTotalAmount', () => {
  it('calculates total amount for outgoing transaction without change', async () => {
    const result = await getTransactionTotalAmount({
      inputs: [{ txId: 'txId1', index: 0 }] as Wallet.Cardano.TxIn[],
      outputs: [{ address: 'address2', value: { coins: BigInt(10_000_000) } }] as Wallet.Cardano.TxOut[],
      addresses: [{ address: 'address1' }] as Wallet.KeyManagement.GroupedAddress[],
      fee: BigInt(1_000_000),
      direction: 'Outgoing',
      resolveInput: () =>
        Promise.resolve({
          address: 'address1',
          value: { coins: BigInt(13_000_000) }
        } as Wallet.Cardano.TxOut)
    });

    expect(result).toEqual(new BigNumber(12_000_000));
  });

  it('calculates total amount for outgoing transaction with change', async () => {
    const result = await getTransactionTotalAmount({
      inputs: [{ txId: 'txId1', index: 0 }] as Wallet.Cardano.TxIn[],
      outputs: [
        { address: 'address1', value: { coins: BigInt(9_000_000) } },
        { address: 'address2', value: { coins: BigInt(5_000_000) } }
      ] as Wallet.Cardano.TxOut[],
      addresses: [{ address: 'address1' }] as Wallet.KeyManagement.GroupedAddress[],
      fee: BigInt(1_000_000),
      direction: 'Outgoing',
      resolveInput: () =>
        Promise.resolve({
          address: 'address1',
          value: { coins: BigInt(15_000_000) }
        } as Wallet.Cardano.TxOut)
    });

    expect(result).toEqual(new BigNumber(5_000_000));
  });

  it('calculates total amount for incoming transaction', async () => {
    const result = await getTransactionTotalAmount({
      inputs: [{ txId: 'txId1', index: 0 }] as Wallet.Cardano.TxIn[],
      outputs: [
        { address: 'address1', value: { coins: BigInt(11_000_000) } },
        { address: 'address2', value: { coins: BigInt(10_000_000) } }
      ] as Wallet.Cardano.TxOut[],
      addresses: [{ address: 'address1' }] as Wallet.KeyManagement.GroupedAddress[],
      fee: BigInt(1_000_000),
      direction: 'Outgoing',
      resolveInput: () =>
        Promise.resolve({
          address: 'address2',
          value: { coins: BigInt(22_000_000) }
        } as Wallet.Cardano.TxOut)
    });

    expect(result).toEqual(new BigNumber(10_000_000));
  });

  it('calculates total amount for outgoing transaction with foreign input', async () => {
    const result = await getTransactionTotalAmount({
      inputs: [
        { txId: 'txId1', index: 0 },
        { txId: 'txId2', index: 0 }
      ] as Wallet.Cardano.TxIn[],
      outputs: [
        { address: 'address1', value: { coins: BigInt(7_000_000) } },
        { address: 'address2', value: { coins: BigInt(5_000_000) } },
        { address: 'address2', value: { coins: BigInt(10_000_000) } }
      ] as Wallet.Cardano.TxOut[],
      addresses: [{ address: 'address1' }] as Wallet.KeyManagement.GroupedAddress[],
      fee: BigInt(1_000_000),
      direction: 'Outgoing',
      resolveInput: jest
        .fn()
        .mockResolvedValueOnce({
          address: 'address1',
          value: { coins: BigInt(13_000_000) }
        } as Wallet.Cardano.TxOut)
        .mockResolvedValueOnce({
          address: 'address2',
          value: { coins: BigInt(10_000_000) }
        } as Wallet.Cardano.TxOut)
    });

    expect(result).toEqual(new BigNumber(5_000_000));
  });

  it('calculates total amount for withdrawl transaction', async () => {
    const result = await getTransactionTotalAmount({
      inputs: [{ txId: 'txId1', index: 0 }] as Wallet.Cardano.TxIn[],
      outputs: [{ address: 'address1', value: { coins: BigInt(10_000_000) } }] as Wallet.Cardano.TxOut[],
      addresses: [{ address: 'address1', rewardAccount: 'stakeAddress1' }] as Wallet.KeyManagement.GroupedAddress[],
      fee: BigInt(1_000_000),
      direction: 'Outgoing',
      withdrawals: [{ stakeAddress: 'stakeAddress1', quantity: BigInt(1_000_000) }] as Wallet.Cardano.Withdrawal[],
      resolveInput: jest.fn().mockResolvedValueOnce({
        address: 'address1',
        value: { coins: BigInt(8_000_000) }
      } as Wallet.Cardano.TxOut)
    });

    expect(result).toEqual(new BigNumber(0));
  });
});
