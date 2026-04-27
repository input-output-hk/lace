import { Cardano } from '@cardano-sdk/core';
import { logger } from '@cardano-sdk/util-dev';
import { CardanoRewardAccount } from '@lace-contract/cardano-context';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { BlockfrostUtxoProvider } from '../../../src/blockfrost';
import { generateRandomCharacters, mockResponses } from '../util';

import type { HttpClient } from '@lace-lib/util-provider';

const sampleAccountUtxos = [
  {
    address:
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    tx_hash: '39a7a284c2a0948189dc45dec670211cd4d72f7b66c5726c08d9b3df11e44d58',
    output_index: 0,
    amount: [
      {
        unit: 'lovelace',
        quantity: '42000000',
      },
    ],
    block: '7eb8e27d18686c7db9a18f8bbcfe34e3fed6e047afaa2d969904d15e934847e6',
    data_hash:
      '9e478573ab81ea7a8e31891ce0648b81229f408d596a3483e6f4f9b92d3cf710',
    inline_datum: null,
    reference_script_hash: null,
  },
  {
    address:
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    tx_hash: '4c4e67bafa15e742c13c592b65c8f74c769cd7d9af04c848099672d1ba391b49',
    output_index: 0,
    amount: [
      {
        unit: 'lovelace',
        quantity: '729235000',
      },
    ],
    block: '953f1b80eb7c11a7ffcd67cbd4fde66e824a451aca5a4065725e5174b81685b7',
    data_hash: null,
    inline_datum: null,
    reference_script_hash: null,
  },
  {
    address:
      'addr1qxqs59lphg8g6qndelq8xwqn60ag3aeyfcp33c2kdp46a09re5df3pzwwmyq946axfcejy5n4x0y99wqpgtp2gd0k09qsgy6pz',
    tx_hash: '768c63e27a1c816a83dc7b07e78af673b2400de8849ea7e7b734ae1333d100d2',
    output_index: 1,
    amount: [
      {
        unit: 'lovelace',
        quantity: '42000000',
      },
      {
        unit: 'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e',
        quantity: '12',
      },
    ],
    block: '5c571f83fe6c784d3fbc223792627ccf0eea96773100f9aedecf8b1eda4544d7',
    data_hash: null,
    inline_datum: null,
    reference_script_hash: null,
  },
];

const rewardAccount = CardanoRewardAccount(
  'stake_test1urpklgzqsh9yqz8pkyuxcw9dlszpe5flnxjtl55epla6ftqktdyfz',
);

describe('BlockfrostUtxoProvider', () => {
  let provider: BlockfrostUtxoProvider;
  let request: Mock;

  beforeEach(() => {
    request = vi.fn();
    const client = { request } as unknown as HttpClient;
    provider = new BlockfrostUtxoProvider(client, logger);
  });

  it('should return account UTxOs (single page)', async () => {
    mockResponses(request, [
      [
        `accounts/${rewardAccount}/utxos?order=desc&page=1&count=100`,
        {
          data: sampleAccountUtxos,
          status: 200,
        },
      ],
    ]);

    const result = await firstValueFrom(
      provider.getAccountUtxos({ rewardAccount }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const utxos = result.value;
      expect(utxos).toHaveLength(3);

      const [input0, output0] = utxos[0];
      expect(input0.txId).toEqual(
        Cardano.TransactionId(sampleAccountUtxos[0].tx_hash),
      );
      expect(input0.index).toEqual(sampleAccountUtxos[0].output_index);
      expect(output0.address).toEqual(
        Cardano.PaymentAddress(sampleAccountUtxos[0].address),
      );
      expect(output0.value.coins).toEqual(BigInt(42000000));

      const [, output2] = utxos[2];
      // verify multi-asset mapping
      expect(
        output2.value.assets?.get(
          Cardano.AssetId(
            'b0d07d45fe9514f80213f4020e5a61241458be626841cde717cb38a76e7574636f696e',
          ),
        ),
      ).toEqual(BigInt(12));
    }
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(request).mockRejectedValue(new Error('API Error'));

    const result = await firstValueFrom(
      provider.getAccountUtxos({ rewardAccount }),
    );

    expect(result.isErr()).toBe(true);
  });

  it('should paginate across multiple pages', async () => {
    const makeUtxo = (index: number) => ({
      address:
        'addr_test1qruygd02feqeue4hkt67vwgn03p04uuv2k34ed25n4rcwt8pa7kgfet22l6w3078tm72c62p4597urnlpw6v6278cpxs8jxykl',
      tx_hash: `${generateRandomCharacters(63)}${index}`,
      output_index: index,
      amount: [{ unit: 'lovelace', quantity: '1000000' }],
      block: `block_${index}`,
      data_hash: null,
      inline_datum: null,
      reference_script_hash: null,
    });

    const page1 = Array.from({ length: 2 }, (_, index) => makeUtxo(index));
    const page2 = Array.from({ length: 1 }, (_, index) => makeUtxo(2 + index));

    mockResponses(request, [
      [
        `accounts/${rewardAccount}/utxos?order=desc&page=1&count=2`,
        { data: page1, status: 200 },
      ],
      [
        `accounts/${rewardAccount}/utxos?order=desc&page=2&count=2`,
        { data: page2, status: 200 },
      ],
    ]);

    const result = await firstValueFrom(
      provider.getAccountUtxos({ rewardAccount, pageSize: 2 }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(3);
    }
  });
});
