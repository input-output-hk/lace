import { Cardano, ProviderFailure } from '@cardano-sdk/core';
import { logger } from '@cardano-sdk/util-dev';
import {
  CardanoPaymentAddress,
  CardanoRewardAccount,
} from '@lace-contract/cardano-context';
import { HttpClientError, ProviderError } from '@lace-lib/util-provider';
import { Timestamp } from '@lace-sdk/util';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostActivityProvider } from '../../../src/blockfrost';
import { mockResponses } from '../util';

import { mockBlockfrostAddressTransactions } from './mocks/address-transactions-mocks';

import type { Responses } from '@blockfrost/blockfrost-js';
import type { CardanoTransactionHistoryItem } from '@lace-contract/cardano-context';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Mock } from 'vitest';

describe('BlockfrostActivityProvider', () => {
  let request: Mock;
  let provider: BlockfrostActivityProvider;

  beforeEach(() => {
    request = vi.fn();
    const client = { request } as unknown as HttpClient;
    provider = new BlockfrostActivityProvider(client, logger);
  });

  describe('getTransaction', () => {
    const txId = Cardano.TransactionId(
      '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
    );

    const txDetailsResponse: Responses['tx_content'] = {
      hash: '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
      block: 'dede5b32714120326c9e1c18e31ffe3b9442951b66d904be9da751aa5c0179bb',
      block_height: 3572194,
      block_time: 1749722211,
      slot: 94039011,
      index: 0,
      output_amount: [
        {
          unit: 'lovelace',
          quantity: '3477500077',
        },
      ],
      fees: '168317',
      deposit: '0',
      size: 286,
      invalid_before: null,
      invalid_hereafter: null,
      utxo_count: 3,
      withdrawal_count: 0,
      mir_cert_count: 0,
      delegation_count: 0,
      stake_cert_count: 0,
      pool_update_count: 0,
      pool_retire_count: 0,
      asset_mint_or_burn_count: 0,
      redeemer_count: 0,
      valid_contract: true,
    };

    const txCborResponse: Responses['tx_content_cbor'] = {
      cbor: '84a300d90102818258207577617e7378a6a3f6f09185c662feeb86428366430b263e399879152c9e55fe01018282583900f84435ea4e419e66b7b2f5e639137c42faf38c55a35cb5549d47872ce1efac84e56a57f4e8bfc75efcac6941ad0bee0e7f0bb4cd2bc7c04d1a01298be0825839001d67cd7aeaaedee4fe73ecaabe7cc892a48fb450119dda0ddd76f9252e7b13f6d9124a16ddfec464771f57e184571fb3cb8f8b3c1a7558681ace1ce4cd021a0002917da100818258207afdd392701bfe44e3b6a59f173177685689a6672e7b71647ea7087ea1aaf5a158400ba94aff77ac8c05e4df45ff4e2cfc70ee8e92bf0efade11507122da68b8b18bbc1a7b7b08538681c083232a8cb9d964380f2bb899ab4b18a6384887b80a6301f5f6',
    };

    const txUtxosResponse: Responses['tx_content_utxo'] = {
      hash: '80be2d8820b8946037764fcba8177a3eb1cae94bf8993def14dda20cb89390c2',
      inputs: [
        {
          address:
            'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
          amount: [
            {
              unit: 'lovelace',
              quantity: '3477668394',
            },
          ],
          tx_hash:
            '7577617e7378a6a3f6f09185c662feeb86428366430b263e399879152c9e55fe',
          output_index: 1,
          data_hash: null,
          inline_datum: null,
          reference_script_hash: null,
          collateral: false,
          reference: false,
        },
      ],
      outputs: [
        {
          address:
            'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
          amount: [
            {
              unit: 'lovelace',
              quantity: '19500000',
            },
          ],
          output_index: 0,
          data_hash: null,
          inline_datum: null,
          collateral: false,
          reference_script_hash: null,
          consumed_by_tx: null,
        },
        {
          address:
            'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
          amount: [
            {
              unit: 'lovelace',
              quantity: '3458000077',
            },
          ],
          output_index: 1,
          data_hash: null,
          inline_datum: null,
          collateral: false,
          reference_script_hash: null,
          consumed_by_tx: null,
        },
      ],
    };

    it('fetches and constructs transaction', async () => {
      mockResponses(request, [
        [`txs/${txId}`, { data: txDetailsResponse }],
        [`txs/${txId}/cbor`, { data: txCborResponse }],
        [`txs/${txId}/utxos`, { data: txUtxosResponse }],
      ]);

      const txDetails = (
        await firstValueFrom(provider.getTransactionDetails(txId))
      ).unwrap();

      // Verify hydratedTx properties
      expect(txDetails.id).toEqual(txId);
      expect(txDetails.blockHeader).toEqual({
        blockNo: Cardano.BlockNo(3572194),
        hash: Cardano.BlockId(
          'dede5b32714120326c9e1c18e31ffe3b9442951b66d904be9da751aa5c0179bb',
        ),
        slot: Cardano.Slot(94039011),
      });
      expect(txDetails.inputSource).toEqual(Cardano.InputSource.inputs);
      expect(txDetails.body.inputs).toHaveLength(1);
      expect(txDetails.body.outputs).toHaveLength(2);

      // Verify txDetails properties
      expect(txDetails.blockTime).toEqual(txDetailsResponse.block_time);
    });

    it('handles error on tx details fetch', async () => {
      const error = new HttpClientError(404, 'Transaction not found');
      mockResponses(request, [[`txs/${txId}`, error]]);

      const result = await firstValueFrom(provider.getTransactionDetails(txId));

      expect(result.expectErr('should be 404 not found error')).toEqual(
        new ProviderError(
          ProviderFailure.NotFound,
          error,
          'Transaction not found',
        ),
      );
    });

    it('handles error on tx cbor fetch', async () => {
      const error = new HttpClientError(500, 'Internal server error');
      mockResponses(request, [
        [`txs/${txId}`, { data: txDetailsResponse }],
        [`txs/${txId}/cbor`, error],
      ]);

      const result = await firstValueFrom(provider.getTransactionDetails(txId));

      expect(result.expectErr('should be internal server error')).toEqual(
        new ProviderError(
          ProviderFailure.Unhealthy,
          error,
          'Internal server error',
        ),
      );
    });

    it('handles error on tx utxos fetch', async () => {
      const error = new HttpClientError(500, 'Internal server error');
      mockResponses(request, [
        [`txs/${txId}`, { data: txDetailsResponse }],
        [`txs/${txId}/cbor`, { data: txCborResponse }],
        [`txs/${txId}/utxos`, error],
      ]);

      const result = await firstValueFrom(provider.getTransactionDetails(txId));

      expect(result.expectErr('should be internal server error')).toEqual(
        new ProviderError(
          ProviderFailure.Unhealthy,
          error,
          'Internal server error',
        ),
      );
    });
  });

  describe('getAddressTransactionHistory', () => {
    const addresses = [
      CardanoPaymentAddress(
        'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
      ),
      CardanoPaymentAddress(
        'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
      ),
      CardanoPaymentAddress(
        'addr_test1qqwk0nt6a2hdae87w0k240nuezf2fra52qgemksdm4m0jffw0vfldkgjfgtdmlkyv3m374lps3t3lv7t379ncxn4tp5qlnk7yu',
      ),
    ];

    it('fetches transactions history for an address, returning only the latest 10', async () => {
      // Mock responses for each address using our prepared mock data
      mockResponses(request, [
        [
          `addresses/${addresses[0]}/transactions?count=5&order=desc`,
          { data: mockBlockfrostAddressTransactions[addresses[0]] },
        ],
        [
          `addresses/${addresses[1]}/transactions?count=10&order=desc`,
          { data: mockBlockfrostAddressTransactions[addresses[1]] },
        ],
      ]);

      const resultAddress1 = (
        await firstValueFrom(
          provider.getAddressTransactionHistory({
            address: addresses[0],
            numberOfItems: 5,
          }),
        )
      ).unwrap();

      const resultAddress2 = (
        await firstValueFrom(
          provider.getAddressTransactionHistory({
            address: addresses[1],
            numberOfItems: 10,
          }),
        )
      ).unwrap();

      expect(resultAddress1).toEqual(
        mockBlockfrostAddressTransactions[
          addresses[0]
        ].map<CardanoTransactionHistoryItem>(raw => ({
          txId: Cardano.TransactionId(raw.tx_hash),
          blockNumber: Cardano.BlockNo(raw.block_height),
          txIndex: Cardano.TxIndex(raw.tx_index),
          blockTime: Timestamp(raw.block_time * 1000),
        })),
      );
      expect(resultAddress2).toEqual(
        mockBlockfrostAddressTransactions[
          addresses[1]
        ].map<CardanoTransactionHistoryItem>(raw => ({
          txId: Cardano.TransactionId(raw.tx_hash),
          blockNumber: Cardano.BlockNo(raw.block_height),
          txIndex: Cardano.TxIndex(raw.tx_index),
          blockTime: Timestamp(raw.block_time * 1000),
        })),
      );
    });

    it('handles error when fetching transactions', async () => {
      const error = new HttpClientError(500, 'Internal server error');
      mockResponses(request, [
        [`addresses/${addresses[0]}/transactions?count=10&order=desc`, error],
      ]);

      const result = await firstValueFrom(
        provider.getAddressTransactionHistory({
          address: addresses[0],
          numberOfItems: 10,
        }),
      );

      expect(result.expectErr('should be internal server error')).toEqual(
        new ProviderError(
          ProviderFailure.Unhealthy,
          error,
          'Internal server error',
        ),
      );
    });
  });
  describe('getTotalAccountTransactionCount', () => {
    const stakeAddress = CardanoRewardAccount(
      'stake_test1uqhw4lq6p8x8l0p4k2q2kjnl3r7p4k2q2kjnl3r7p4k2q2kjnl3ra',
    );

    it('fetches total tx count for a stake address', async () => {
      mockResponses(request, [
        [
          `accounts/${stakeAddress}/addresses/total`,
          { data: { tx_count: 123 } },
        ],
      ]);

      const count = (
        await firstValueFrom(
          provider.getTotalAccountTransactionCount(stakeAddress),
        )
      ).unwrap();

      expect(count).toBe(123);
    });

    it('handles error when fetching total tx count', async () => {
      const error = new HttpClientError(500, 'Internal server error');
      mockResponses(request, [
        [`accounts/${stakeAddress}/addresses/total`, error],
      ]);

      const result = await firstValueFrom(
        provider.getTotalAccountTransactionCount(stakeAddress),
      );

      expect(result.expectErr('should be internal server error')).toEqual(
        new ProviderError(
          ProviderFailure.Unhealthy,
          error,
          'Internal server error',
        ),
      );
    });
  });
});
