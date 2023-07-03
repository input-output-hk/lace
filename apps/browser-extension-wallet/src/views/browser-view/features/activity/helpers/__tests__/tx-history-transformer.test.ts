/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
/* eslint-disable no-magic-numbers */
import * as txHistoryTransformers from '../tx-history-transformer';
import { Wallet } from '@lace/cardano';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { cardanoCoin } from '@src/utils/constants';
import * as txInspection from '@src/utils/tx-inspection';
import * as pendingTxTransformer from '../pending-tx-transformer';
import { TxDirection } from '@src/types';
import { AssetActivityItemProps } from '@lace/core';

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
      withdrawals: [{ quantity: BigInt(2) } as Wallet.Cardano.Withdrawal]
    },
    witness: {
      signatures: new Map()
    }
  };

  const date = new Date(Date.UTC(2022, 1, 1, 10, 10));

  test('should return parsed incoming tx', async () => {
    const result: any = txHistoryTransformers.txHistoryTransformer({
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
      time: date,
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      fiatPrice: 1,
      protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
      cardanoCoin
    });
    expect(result.status).toBe('success');
    expect(result.amount).toBe('20.00 ADA');
  });

  test('should return parsed outgoing tx', async () => {
    const result: any = txHistoryTransformers.txHistoryTransformer({
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
      time: date,
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      fiatPrice: 1,
      protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
      cardanoCoin
    });
    expect(result.status).toBe('success');
    expect(result.amount).toBe('30.00 ADA');
  });

  test('should return tx of reward type', async () => {
    const direction = 'tx-direction';
    const rewardsAmount = '10';
    const formattedAmount = 'getFormattedAmount';
    const formattedFiatAmount = 'getFormattedFiatAmount';
    const transformedTx = {
      date: 'date',
      timestamp: 'timestamp'
    };
    const getFormattedAmountSpy = jest
      .spyOn(pendingTxTransformer, 'getFormattedAmount')
      .mockReturnValueOnce(formattedAmount);
    const getFormattedFiatAmountSpy = jest
      .spyOn(pendingTxTransformer, 'getFormattedFiatAmount')
      .mockReturnValueOnce(formattedFiatAmount);
    const txTransformerSpy = jest
      .spyOn(pendingTxTransformer, 'txTransformer')
      .mockReturnValueOnce(transformedTx as unknown as Omit<AssetActivityItemProps, 'onClick'>);
    const inspectTxTypeSpy = jest.spyOn(txInspection, 'inspectTxType').mockReturnValueOnce('self-rewards');
    const getTxDirectionSpy = jest.spyOn(txInspection, 'getTxDirection').mockReturnValueOnce(direction as TxDirection);
    const getRewardsAmountSpy = jest
      .spyOn(txHistoryTransformers, 'getRewardsAmount')
      .mockReturnValueOnce(rewardsAmount);

    const props = {
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
      time: date,
      fiatCurrency: {
        code: 'USD',
        symbol: '$'
      },
      fiatPrice: 1,
      protocolParameters: { poolDeposit: 3, stakeKeyDeposit: 2 } as Wallet.ProtocolParameters,
      cardanoCoin
    };
    const result: any = txHistoryTransformers.txHistoryTransformer(props);

    expect(inspectTxTypeSpy).toBeCalledWith({
      walletAddresses: props.walletAddresses,
      tx: props.tx
    });
    expect(getTxDirectionSpy).toBeCalledWith({
      type: 'self-rewards'
    });
    expect(getRewardsAmountSpy).toBeCalledWith(
      props.tx?.body?.withdrawals,
      props.walletAddresses.map((addr) => addr.rewardAccount)
    );
    expect(txTransformerSpy).toBeCalledWith({
      tx: props.tx,
      walletAddresses: props.walletAddresses,
      fiatCurrency: props.fiatCurrency,
      fiatPrice: props.fiatPrice,
      time: props.time,
      protocolParameters: props.protocolParameters,
      cardanoCoin: props.cardanoCoin,
      status: Wallet.TransactionStatus.SUCCESS,
      direction,
      date: '01 February 2022'
    });
    expect(result).toEqual([
      { ...transformedTx, type: 'self' },
      {
        type: 'rewards',
        direction: 'Incoming',
        amount: formattedAmount,
        fiatAmount: formattedFiatAmount,
        status: Wallet.TransactionStatus.SPENDABLE,
        date: transformedTx.date,
        assets: [],
        timestamp: transformedTx.timestamp
      }
    ]);

    txTransformerSpy.mockRestore();
    inspectTxTypeSpy.mockRestore();
    getTxDirectionSpy.mockRestore();
    getFormattedAmountSpy.mockRestore();
    getFormattedFiatAmountSpy.mockRestore();
    getRewardsAmountSpy.mockRestore();
  });
});
