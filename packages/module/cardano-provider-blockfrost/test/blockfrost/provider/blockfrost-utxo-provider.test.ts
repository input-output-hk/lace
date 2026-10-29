import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';
import { logger } from '@cardano-sdk/util-dev';
import {
  CardanoRewardAccount,
  type CardanoPaymentAddress,
} from '@lace-contract/cardano-context';
import { HttpClientError } from '@lace-lib/util-provider';
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

  it('treats a 404 (stake key never seen on-chain) as an empty UTxO set', async () => {
    mockResponses(request, [
      [
        `accounts/${rewardAccount}/utxos?order=desc&page=1&count=100`,
        new HttpClientError(404, 'Not Found'),
      ],
    ]);

    const result = await firstValueFrom(
      provider.getAccountUtxos({ rewardAccount }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value).toEqual([]);
  });

  it('surfaces non-404 errors as Err', async () => {
    mockResponses(request, [
      [
        `accounts/${rewardAccount}/utxos?order=desc&page=1&count=100`,
        new HttpClientError(500, 'Server Error'),
      ],
    ]);

    const result = await firstValueFrom(
      provider.getAccountUtxos({ rewardAccount }),
    );

    expect(result.isErr()).toBe(true);
  });

  it('requests afresh on each subscription, so a retry does not replay a failure', async () => {
    const serverError = new HttpClientError(500, 'Server Error');
    serverError.status = 500;
    request
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({ data: sampleAccountUtxos, status: 200 });

    const utxos$ = provider.getAccountUtxos({ rewardAccount });
    expect(request).not.toHaveBeenCalled();

    expect((await firstValueFrom(utxos$)).isErr()).toBe(true);
    const retried = await firstValueFrom(utxos$);

    expect(retried.isOk()).toBe(true);
    if (retried.isOk()) expect(retried.value).toHaveLength(3);
    expect(request).toHaveBeenCalledTimes(2);
  });

  describe('getUtxosAtAddress', () => {
    // cNIGHT dust-generator testnet script address (enterprise, addr_test1w…).
    const scriptAddress = Cardano.PaymentAddress(
      'addr_test1wplxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qzjheng',
    ) as unknown as CardanoPaymentAddress;

    it('returns the address UTxOs with inline datums populated', async () => {
      mockResponses(request, [
        [
          `addresses/${scriptAddress}/utxos?order=desc&page=1&count=100`,
          {
            data: [
              {
                address: scriptAddress,
                tx_hash:
                  '768c63e27a1c816a83dc7b07e78af673b2400de8849ea7e7b734ae1333d100d2',
                output_index: 1,
                amount: [{ unit: 'lovelace', quantity: '5000000' }],
                block: 'block',
                data_hash: null,
                // Plutus Constr 0 [] — a valid inline datum.
                inline_datum: 'd87980',
                reference_script_hash: null,
              },
            ],
            status: 200,
          },
        ],
      ]);

      const result = await firstValueFrom(
        provider.getUtxosAtAddress({ address: scriptAddress }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const [input, output] = result.value[0];
        expect(input.index).toBe(1);
        expect(output.address).toEqual(scriptAddress);
        // The inline datum must round-trip — the script-spend build relies on it.
        expect(output.datum).toBeDefined();
        expect(output.datumHash).toBeUndefined();
      }
    });

    describe('an output with a reference script', () => {
      const referenceScript: Cardano.PlutusScript = {
        __type: Cardano.ScriptType.Plutus,
        bytes: HexBlob('4e4d01000033222220051200120011'),
        version: Cardano.PlutusLanguageVersion.V3,
      };
      const referenceScriptHash =
        Serialization.Script.fromCore(referenceScript).hash();
      const withScript: Cardano.TxOut = {
        address: Cardano.PaymentAddress(scriptAddress),
        value: { coins: 5_000_000n },
        scriptReference: referenceScript,
      };
      // The scripts sit on outputs 1 and 2; output 0 pays elsewhere, so a
      // lookup that ignores the output index takes the wrong output.
      const producingTransaction = (fee: bigint) =>
        Serialization.Transaction.fromCore({
          id: Cardano.TransactionId('00'.repeat(32)),
          body: {
            inputs: [
              { txId: Cardano.TransactionId('11'.repeat(32)), index: 0 },
            ],
            outputs: [
              {
                address: Cardano.PaymentAddress(sampleAccountUtxos[0].address),
                value: { coins: 1_000_000n },
              },
              withScript,
              withScript,
            ],
            fee,
          },
          witness: { signatures: new Map() },
        });
      const producingTx = producingTransaction(200_000n);
      const txHash = producingTx.getId();
      const listed = (index: number, scriptHash: string | null) => ({
        address: scriptAddress,
        tx_hash: txHash,
        tx_index: index,
        output_index: index,
        amount: [{ unit: 'lovelace', quantity: '5000000' }],
        block: 'block',
        data_hash: null,
        inline_datum: null,
        reference_script_hash: scriptHash,
      });
      const listing = (data: unknown[]): [string, unknown] => [
        `addresses/${scriptAddress}/utxos?order=desc&page=1&count=100`,
        { data, status: 200 },
      ];
      const txCbor: [string, unknown] = [
        `txs/${txHash}/cbor`,
        { data: { cbor: producingTx.toCbor() }, status: 200 },
      ];

      it('reads no producing transaction unless asked to', async () => {
        mockResponses(request, [listing([listed(1, referenceScriptHash)])]);

        const result = await firstValueFrom(
          provider.getUtxosAtAddress({ address: scriptAddress }),
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(1);
          expect(result.value[0][1].scriptReference).toBeUndefined();
        }
        expect(
          request.mock.calls.filter(([endpoint]) =>
            String(endpoint).startsWith('txs/'),
          ),
        ).toHaveLength(0);
      });

      it('carries the script the listing names only by hash', async () => {
        mockResponses(request, [
          listing([
            listed(1, referenceScriptHash),
            listed(2, referenceScriptHash),
          ]),
          txCbor,
        ]);

        const result = await firstValueFrom(
          provider.getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          }),
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(2);
          for (const [, output] of result.value) {
            expect(output.scriptReference).toEqual(referenceScript);
          }
        }
        // Outputs of one transaction share one read of its CBOR.
        expect(
          request.mock.calls.filter(([endpoint]) =>
            String(endpoint).startsWith('txs/'),
          ),
        ).toHaveLength(1);
      });

      it('excludes an output with the wrong script hash while retaining safe siblings', async () => {
        mockResponses(request, [
          listing([
            listed(0, 'cc'.repeat(28)),
            listed(1, referenceScriptHash),
            listed(2, null),
          ]),
          txCbor,
        ]);

        const result = await firstValueFrom(
          provider.getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          }),
        );

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.map(([input]) => input.index)).toEqual([1, 2]);
          expect(result.value[0][1].scriptReference).toEqual(referenceScript);
          expect(result.value[1][1].scriptReference).toBeUndefined();
        }
      });

      it.each([404, 429, 500])(
        'excludes unsafe outputs when the script read fails with HTTP %s',
        async status => {
          const error = new HttpClientError(status, 'Script unavailable');
          error.status = status;
          mockResponses(request, [
            listing([
              listed(1, referenceScriptHash),
              listed(2, referenceScriptHash),
              listed(0, null),
            ]),
            [`txs/${txHash}/cbor`, error],
          ]);

          const result = await firstValueFrom(
            provider.getUtxosAtAddress({
              address: scriptAddress,
              withReferenceScripts: true,
            }),
          );

          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.map(([input]) => input.index)).toEqual([0]);
            expect(result.value[0][1].scriptReference).toBeUndefined();
          }
          expect(
            request.mock.calls.filter(([endpoint]) =>
              String(endpoint).startsWith('txs/'),
            ),
          ).toHaveLength(1);
        },
      );

      it('fails the listing when a reference-script output does not convert', async () => {
        mockResponses(request, [
          listing([
            { ...listed(1, referenceScriptHash), inline_datum: 'not-cbor' },
            listed(0, null),
          ]),
          txCbor,
        ]);

        const result = await firstValueFrom(
          provider.getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          }),
        );

        expect(result.isErr()).toBe(true);
      });

      it('excludes an unsafe output when the producing CBOR is malformed', async () => {
        mockResponses(request, [
          listing([listed(1, referenceScriptHash), listed(0, null)]),
          [`txs/${txHash}/cbor`, { data: { cbor: 'invalid' }, status: 200 }],
        ]);
        const result = await firstValueFrom(
          provider.getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          }),
        );
        expect(result.isOk()).toBe(true);
        if (result.isOk())
          expect(result.value.map(([input]) => input.index)).toEqual([0]);
      });

      it('reads distinct producing transactions in parallel and preserves listing order', async () => {
        const otherTx = Serialization.Transaction.fromCbor(
          producingTx.toCbor(),
        );
        otherTx.body().setFee(200_001n);
        const otherHash = otherTx.getId();
        const otherListed = {
          ...listed(2, referenceScriptHash),
          tx_hash: otherHash,
        };
        let release = () => {};
        const gate = new Promise<void>(resolve => {
          release = resolve;
        });
        request.mockImplementation(async (endpoint: string) => {
          if (endpoint.startsWith('addresses/'))
            return {
              data: [listed(1, referenceScriptHash), otherListed],
              status: 200,
            };
          await gate;
          return {
            data: {
              cbor:
                endpoint === `txs/${txHash}/cbor`
                  ? producingTx.toCbor()
                  : otherTx.toCbor(),
            },
            status: 200,
          };
        });
        const pending = firstValueFrom(
          provider.getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          }),
        );
        try {
          await vi.waitFor(() => {
            expect(request).toHaveBeenCalledWith(
              `txs/${txHash}/cbor`,
              undefined,
            );
            expect(request).toHaveBeenCalledWith(
              `txs/${otherHash}/cbor`,
              undefined,
            );
          });
        } finally {
          release();
        }
        const result = await pending;
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.map(([input]) => input.txId)).toEqual([
            txHash,
            otherHash,
          ]);
          expect(
            result.value.map(([, output]) => output.scriptReference),
          ).toEqual([referenceScript, referenceScript]);
        }
      });

      it('reads at most four producing transactions at once', async () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
          producingTransaction(300_000n + BigInt(index)),
        );
        const cborByEndpoint = new Map(
          transactions.map(transaction => [
            `txs/${transaction.getId()}/cbor`,
            transaction.toCbor(),
          ]),
        );
        let inFlight = 0;
        let maxInFlight = 0;
        request.mockImplementation(async (endpoint: string) => {
          if (endpoint.startsWith('addresses/'))
            return {
              data: transactions.map(transaction => ({
                ...listed(1, referenceScriptHash),
                tx_hash: transaction.getId(),
              })),
              status: 200,
            };
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise(resolve => setTimeout(resolve, 0));
          inFlight -= 1;
          return { data: { cbor: cborByEndpoint.get(endpoint) }, status: 200 };
        });

        const result = await firstValueFrom(
          provider.getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          }),
        );

        expect(maxInFlight).toBe(4);
        expect(
          request.mock.calls.filter(([endpoint]) =>
            String(endpoint).startsWith('txs/'),
          ),
        ).toHaveLength(6);
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.map(([input]) => input.txId)).toEqual(
            transactions.map(transaction => transaction.getId()),
          );
        }
      });

      it('starts no queued producing-transaction read after unsubscription', async () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
          producingTransaction(400_000n + BigInt(index)),
        );
        let release = () => {};
        const gate = new Promise<void>(resolve => {
          release = resolve;
        });
        request.mockImplementation(async (endpoint: string) => {
          if (endpoint.startsWith('addresses/'))
            return {
              data: transactions.map(transaction => ({
                ...listed(1, referenceScriptHash),
                tx_hash: transaction.getId(),
              })),
              status: 200,
            };
          await gate;
          return { data: { cbor: producingTx.toCbor() }, status: 200 };
        });
        const transactionReads = () =>
          request.mock.calls.filter(([endpoint]) =>
            String(endpoint).startsWith('txs/'),
          );

        const subscription = provider
          .getUtxosAtAddress({
            address: scriptAddress,
            withReferenceScripts: true,
          })
          .subscribe();
        await vi.waitFor(() => {
          expect(transactionReads()).toHaveLength(4);
        });
        subscription.unsubscribe();
        release();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(transactionReads()).toHaveLength(4);
      });
    });

    it('treats a 404 (address never funded) as an empty UTxO set', async () => {
      const notFound = new HttpClientError(404, 'Not Found');
      notFound.status = 404;
      mockResponses(request, [
        [
          `addresses/${scriptAddress}/utxos?order=desc&page=1&count=100`,
          notFound,
        ],
      ]);

      const result = await firstValueFrom(
        provider.getUtxosAtAddress({ address: scriptAddress }),
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toEqual([]);
    });

    it('surfaces non-404 errors as Err', async () => {
      const serverError = new HttpClientError(500, 'Server Error');
      serverError.status = 500;
      mockResponses(request, [
        [
          `addresses/${scriptAddress}/utxos?order=desc&page=1&count=100`,
          serverError,
        ],
      ]);

      const result = await firstValueFrom(
        provider.getUtxosAtAddress({ address: scriptAddress }),
      );

      expect(result.isErr()).toBe(true);
    });

    it('requests afresh on each subscription, so a retry does not replay a failure', async () => {
      const serverError = new HttpClientError(500, 'Server Error');
      serverError.status = 500;
      request.mockRejectedValueOnce(serverError).mockResolvedValueOnce({
        data: [
          {
            address: scriptAddress,
            tx_hash: sampleAccountUtxos[0].tx_hash,
            output_index: 0,
            amount: [{ unit: 'lovelace', quantity: '5000000' }],
            block: 'block',
            data_hash: null,
            inline_datum: null,
            reference_script_hash: null,
          },
        ],
        status: 200,
      });

      const utxos$ = provider.getUtxosAtAddress({ address: scriptAddress });
      expect(request).not.toHaveBeenCalled();

      expect((await firstValueFrom(utxos$)).isErr()).toBe(true);
      const retried = await firstValueFrom(utxos$);

      expect(retried.isOk()).toBe(true);
      if (retried.isOk()) expect(retried.value).toHaveLength(1);
      expect(request).toHaveBeenCalledTimes(2);
    });
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
