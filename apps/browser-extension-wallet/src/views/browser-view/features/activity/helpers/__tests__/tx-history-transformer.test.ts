/* eslint-disable unicorn/no-null */
const mockGetFormattedAmount = jest.fn();

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
import * as txTransformers from '../common-tx-transformer';
// import * as txHistoryTransformers from '../tx-history-transformer';
import { Wallet } from '@lace/cardano';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { cardanoCoin } from '@src/utils/constants';
import * as txInspection from '@src/utils/tx-inspection';
import type { TxDirections } from '@src/types';
import { TransactionActivityType } from '@lace/core';

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      util: {
        ...actual.Wallet.util,
        getFormattedAmount: mockGetFormattedAmount
      }
    }
  };
});

dayjs.extend(utc);

describe('Testing txHistoryTransformer function', () => {
  const txHistory: Wallet.Cardano.HydratedTx = {
    inputSource: Wallet.Cardano.InputSource.inputs,
    id: Wallet.Cardano.TransactionId('d0007e225042e46e70778686262117af16ba2673a17315672e49ea26f34b0198'),
    index: 1,
    txSize: 365,
    blockHeader: {
      hash: Wallet.Cardano.BlockId('f4f01b5b9a1553794443ff64c9f97203d1f97f1cf58b94bc0c81ca529774a993'),
      blockNo: Wallet.Cardano.BlockNo(3_075_825),
      slot: Wallet.Cardano.Slot(42_634_497)
    },
    body: {
      inputs: [
        {
          txId: Wallet.Cardano.TransactionId('d0007e225042e46e70778686262117af16ba2673a17315672e49ea26f34b0198'),
          index: 1,
          address: Wallet.Cardano.PaymentAddress(
            'addr_test1qpeg0n942wz3kx7vhmcgwa9t58r9spp4x2x32vfllm4ddkj2he0ldswjwtvp7drsjqmyzugmjhmypdhu3vez5rkkuj5s74q4yw'
          )
        }
      ],
      outputs: [
        {
          address: Wallet.Cardano.PaymentAddress('addr_test1wrsexavz37208qda7mwwu4k7hcpg26cz0ce86f5e9kul3hqzlh22t'),
          value: {
            coins: BigInt('10000000')
          }
        },
        {
          address: Wallet.Cardano.PaymentAddress(
            'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
          ),
          value: {
            coins: BigInt('20000000')
          }
        }
      ],
      fee: BigInt('1000000'),
      validityInterval: {
        invalidBefore: Wallet.Cardano.Slot(1),
        invalidHereafter: Wallet.Cardano.Slot(2)
      },
      withdrawals: [
        {
          quantity: BigInt(2),
          stakeAddress: Wallet.Cardano.RewardAccount('stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx')
        } as Wallet.Cardano.Withdrawal
      ]
    },
    witness: {
      signatures: new Map()
    }
  };

  const date = new Date(Date.UTC(2022, 1, 1, 10, 10));

  test('should return parsed incoming tx', async () => {
    mockGetFormattedAmount.mockReturnValueOnce('20.00 ADA');
    const result: any = await txTransformers.txTransformer({
      tx: txHistory,
      walletAddresses: [
        {
          address: Wallet.Cardano.PaymentAddress(
            'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
          ),
          rewardAccount: Wallet.Cardano.RewardAccount(
            'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
          )
        }
      ] as Wallet.KeyManagement.GroupedAddress[],
      date,
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      fiatPrice: 1,
      protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
      cardanoCoin,
      resolveInput: () => Promise.resolve(null),
      type: TransactionActivityType.incoming
    });

    expect(result[0].status).toBe('success');
    expect(result[0].amount).toBe('20.00 ADA');
  });

  test('should return parsed outgoing tx', async () => {
    mockGetFormattedAmount.mockReturnValueOnce('30.00 ADA');
    const result: any = await txTransformers.txTransformer({
      tx: txHistory,
      walletAddresses: [
        {
          address: Wallet.Cardano.PaymentAddress(
            'addr_test1qpeg0n942wz3kx7vhmcgwa9t58r9spp4x2x32vfllm4ddkj2he0ldswjwtvp7drsjqmyzugmjhmypdhu3vez5rkkuj5s74q4yw'
          ),
          rewardAccount: Wallet.Cardano.RewardAccount(
            'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
          )
        }
      ] as Wallet.KeyManagement.GroupedAddress[],
      date,
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      fiatPrice: 1,
      protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
      cardanoCoin,
      resolveInput: () => Promise.resolve(null),
      type: TransactionActivityType.outgoing
    });

    expect(result[0].status).toBe('success');
    expect(result[0].amount).toBe('30.00 ADA');
  });

  test('should return outgoing tx with withdrawal only as outgoing tx', async () => {
    const direction = 'tx-direction';
    const formattedAmount = 'getFormattedAmount';
    const formattedFiatAmount = 'getFormattedFiatAmount';
    mockGetFormattedAmount.mockReturnValueOnce(formattedAmount);
    const getFormattedFiatAmountSpy = jest
      .spyOn(txTransformers, 'getFormattedFiatAmount')
      .mockReturnValueOnce(formattedFiatAmount);
    const txTransformerSpy = jest.spyOn(txTransformers, 'txTransformer');
    const inspectTxTypeSpy = jest.spyOn(txInspection, 'inspectTxType');
    const getTxDirectionSpy = jest.spyOn(txInspection, 'getTxDirection').mockReturnValueOnce(direction as TxDirections);

    const props: any = {
      tx: txHistory,
      walletAddresses: [
        {
          address: Wallet.Cardano.PaymentAddress(
            'addr_test1qpr3akacs72xelgd60ucdz0j4uw8dkg86jhntqd6gjpk84adv3qw0nafy8arl48xwhhnlzxre3cwx0xjnlwxfm77l00smqpvpz'
          ),
          rewardAccount: Wallet.Cardano.RewardAccount(
            'stake_test1uq7g7kqeucnqfweqzgxk3dw34e8zg4swnc7nagysug2mm4cm77jrx'
          )
        }
      ] as Wallet.KeyManagement.GroupedAddress[],
      date,
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      fiatPrice: 1,
      protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
      cardanoCoin,
      resolveInput: () => Promise.resolve(null),
      type: TransactionActivityType.outgoing
    };
    const result: any = await txTransformers.txTransformer(props);

    expect(inspectTxTypeSpy).toBeCalledWith({
      inputResolver: { resolveInput: props.resolveInput },
      walletAddresses: props.walletAddresses,
      tx: props.tx
    });
    expect(getTxDirectionSpy).toBeCalledWith({
      type: 'outgoing'
    });
    expect(txTransformerSpy).toBeCalledWith({
      tx: props.tx,
      walletAddresses: props.walletAddresses,
      fiatCurrency: props.fiatCurrency,
      fiatPrice: props.fiatPrice,
      date: props.date,
      protocolParameters: props.protocolParameters,
      cardanoCoin: props.cardanoCoin,
      status: Wallet.TransactionStatus.SUCCESS,
      direction,
      resolveInput: props.resolveInput
    });
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('success');
    expect(result[0].type).toBe('outgoing');

    txTransformerSpy.mockRestore();
    inspectTxTypeSpy.mockRestore();
    getTxDirectionSpy.mockRestore();
    getFormattedFiatAmountSpy.mockRestore();
  });
});
