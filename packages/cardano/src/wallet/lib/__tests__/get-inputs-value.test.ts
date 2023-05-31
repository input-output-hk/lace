/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable promise/avoid-new */
/* eslint-disable max-len */
/* eslint-disable sonarjs/no-identical-functions */
import '@testing-library/jest-dom';
import { getTxInputsValueAndAddress } from '../get-inputs-value';
import { act } from 'react-dom/test-utils';
import { Cardano } from '@cardano-sdk/core';
import { of } from 'rxjs';
import { ObservableWallet } from '@cardano-sdk/wallet';

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
    }
  } as ObservableWallet;
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
    const mockWalletProvider = {
      transactionsByHashes: (_hashes: string[]) => new Promise((resolve) => resolve([transactionMock]))
    };

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
    const mockWalletProvider = {
      transactionsByHashes: (_hashes: string[]) => new Promise((resolve) => resolve([transactionMock]))
    };

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
});
