/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable sonarjs/no-identical-functions */
import '@testing-library/jest-dom';
import { getTxInputsValueAndAddress } from '../get-inputs-value';
import { act } from 'react-dom/test-utils';
import { Cardano, ChainHistoryProvider } from '@cardano-sdk/core';
import { of } from 'rxjs';
import { ObservableWallet } from '@cardano-sdk/wallet';

const getMockWalletProvider = (mock: Cardano.HydratedTx) => ({
  transactionsByHashes: (_hashes: string[]) => new Promise<Cardano.HydratedTx[]>((resolve) => resolve([mock]))
});

describe('Testing getTxInputsValueAndAddress function', () => {
  const wallet = {
    utxo: {
      available$: of([
        [
          {
            address: Cardano.PaymentAddress(
              'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
            ),
            index: 0,
            txId: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608')
          },
          {
            address: Cardano.PaymentAddress(
              'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
            ),
            datum: undefined,
            value: {
              coins: BigInt('3000000'),
              assets: new Map([
                [Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('30')]
              ]) as Cardano.TokenMap
            }
          }
        ] as Cardano.Utxo
      ]),
      total$: of([]),
      unspendable$: of([])
    },
    transactions: {
      history$: of([]),
      outgoing: {
        signed$: of([])
      }
    }
  } as ObservableWallet;

  const multiDelegationTransactionMock: Cardano.HydratedTx = {
    inputSource: Cardano.InputSource.inputs,
    id: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608'),
    index: 19,
    witness: {
      redeemers: undefined,
      signatures: new Map()
    },
    txSize: 297,
    auxiliaryData: {
      blob: new Map()
    },
    blockHeader: {
      hash: Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
      blockNo: Cardano.BlockNo(3_114_963),
      slot: Cardano.Slot(43_905_372)
    },
    body: {
      certificates: undefined,
      fee: BigInt('168273'),
      withdrawals: undefined,
      inputs: [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
          ),
          index: 0,
          txId: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608')
        },
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
          ),
          index: 1,
          txId: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608')
        }
      ],
      outputs: [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
          ),
          datum: undefined,
          value: {
            coins: BigInt('3000000'),
            assets: new Map([
              [Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('30')]
            ]) as Cardano.TokenMap
          }
        },
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
          ),
          datum: undefined,
          value: {
            coins: BigInt('100000'),
            assets: new Map([
              [Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('10')]
            ]) as Cardano.TokenMap
          }
        }
      ],
      validityInterval: {
        invalidHereafter: Cardano.Slot(44_094_741)
      }
    }
  };
  const transactionMock: Cardano.HydratedTx = {
    inputSource: Cardano.InputSource.inputs,
    id: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608'),
    index: 19,
    witness: {
      redeemers: undefined,
      signatures: new Map()
    },
    txSize: 297,
    auxiliaryData: {
      blob: new Map()
    },
    blockHeader: {
      hash: Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
      blockNo: Cardano.BlockNo(3_114_963),
      slot: Cardano.Slot(43_905_372)
    },
    body: {
      certificates: undefined,
      fee: BigInt('168273'),
      withdrawals: undefined,
      inputs: [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
          ),
          index: 0,
          txId: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608')
        }
      ],
      outputs: [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
          ),
          datum: undefined,
          value: {
            coins: BigInt('3000000'),
            assets: new Map([
              [Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('30')]
            ]) as Cardano.TokenMap
          }
        }
      ],
      validityInterval: {
        invalidHereafter: Cardano.Slot(44_094_741)
      }
    }
  };

  test('should return inputs with ada value for confirmed tx inputs', async () => {
    const mockWalletProvider = getMockWalletProvider(transactionMock);

    const result = getTxInputsValueAndAddress(
      [
        {
          address: Cardano.PaymentAddress(
            'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
          ),
          index: 0,
          txId: Cardano.TransactionId('6a9856c4f286ae3fd01256de9f05390e3b1bc6e8278806235053b49ac1c33608')
        } as Cardano.HydratedTxIn
      ],
      mockWalletProvider as any,
      wallet
    );

    await act(async () => {
      const inputs = await result;

      // From confirmed input
      expect(inputs[0].address).toBe(
        'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
      );
      // From matched output in mocked transaction
      expect(inputs[0].value.coins.toString()).toBe('3000000');
      expect(
        inputs[0].value.assets
          .get(Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'))
          .toString()
      ).toBe('30');
    });
  });

  test('should return inputs with value and address for new tx inputs', async () => {
    const mockWalletProvider = getMockWalletProvider(transactionMock);

    const result = getTxInputsValueAndAddress(
      [
        {
          index: 0,
          txId: transactionMock.id
        } as Cardano.TxIn
      ],
      mockWalletProvider as any,
      wallet
    );

    await act(async () => {
      const inputs = await result;

      // From output in wallet.utxo.available$
      expect(inputs[0].address).toBe(
        'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
      );
      // From matched output in mocked transaction
      expect(inputs[0].value.coins.toString()).toBe('3000000');
      expect(
        inputs[0].value.assets
          .get(Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'))
          .toString()
      ).toBe('30');
    });
  });

  test('should resolve inputs from the same transaction only once', async () => {
    const transactionsByHashes = jest.fn().mockResolvedValue([
      {
        id: 'txId1',
        body: {
          outputs: Array.from({ length: 30 }).map(() => ({
            address: 'address',
            value: {
              coins: BigInt('3000000')
            }
          }))
        }
      }
    ]);

    const result = getTxInputsValueAndAddress(
      Array.from({ length: 30 }).map((_, index) => ({ index, txId: 'txId1' } as unknown as Cardano.TxIn)),
      {
        transactionsByHashes
      } as unknown as ChainHistoryProvider,
      wallet
    );

    await act(async () => {
      const inputs = await result;
      expect(transactionsByHashes).toBeCalledTimes(1);
      expect(inputs[0].address).toBe('address');
      expect(inputs[0].value.coins.toString()).toBe('3000000');
    });
  });

  test('should return inputs with value and address for every input', async () => {
    const transactionsByHashes = jest.fn().mockImplementation(({ ids }) =>
      Promise.resolve(
        ids.map((id: Cardano.TransactionId) => ({
          id,
          body: {
            outputs: [
              {
                address: 'address',
                value: {
                  coins: BigInt('3000000')
                }
              }
            ]
          }
        }))
      )
    );

    const result = getTxInputsValueAndAddress(
      Array.from({ length: 30 }).map((_, index) => ({ index: 0, txId: `txId${index}` } as Cardano.TxIn)),
      {
        transactionsByHashes
      } as unknown as ChainHistoryProvider,
      wallet
    );

    await act(async () => {
      const inputs = await result;
      expect(transactionsByHashes).toBeCalledTimes(30);
      expect(inputs.every(({ value, address }) => value && address)).toBe(true);
      expect(inputs).toHaveLength(30);
    });
  });

  test('should return inputs of multi delegation transactions with the duplicate txIDs', async () => {
    const mockWalletProvider = getMockWalletProvider(multiDelegationTransactionMock);

    const result = getTxInputsValueAndAddress(
      [
        {
          index: 0,
          txId: multiDelegationTransactionMock.id
        } as Cardano.TxIn,
        {
          index: 1,
          txId: multiDelegationTransactionMock.id
        } as Cardano.TxIn,
        {
          index: 1,
          txId: multiDelegationTransactionMock.id
        } as Cardano.TxIn
      ],
      mockWalletProvider as any,
      wallet
    );

    await act(async () => {
      const inputs = await result;

      // Assert the properties for the first input
      expect(inputs[0].address).toBe(
        'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p'
      );
      expect(inputs[0].value.coins.toString()).toBe('3000000');
      expect(
        inputs[0].value.assets
          .get(Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'))
          .toString()
      ).toBe('30');

      // Assert the properties for the second input
      expect(inputs[1].address).toBe(
        'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
      );

      expect(
        inputs[1].value.assets
          .get(Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'))
          .toString()
      ).toBe('10');

      expect(inputs[1].value.coins.toString()).toBe('100000');

      expect(inputs[2].address).toBe(
        'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
      );
    });
  });
});
