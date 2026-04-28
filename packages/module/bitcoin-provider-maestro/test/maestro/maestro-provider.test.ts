import {
  BitcoinFeeEstimationMode,
  BitcoinTransactionStatus,
} from '@lace-contract/bitcoin-context';
import { HttpClientError } from '@lace-lib/util-provider';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MaestroBitcoinProvider } from '../../src/maestro';

import {
  ADDRESS_MEMPOOL_TXS_PAGE,
  ADDRESS_TXS_PAGE,
  COINBASE_OP_RETURN_TX,
  FEE_ESTIMATION_INVALID_RESPONSE,
  FEE_ESTIMATION_RESPONSE,
  LAST_KNOWN_BLOCK_RESPONSE,
  REGULAR_TX,
  TX_58b595,
  TX_B4EA3A,
  TX_B59C44,
  TX_D86865,
  TX_E1502F,
  TX_F9D145,
  TX_SUBMIT_SUCCESS,
  UTXOS_RESPONSE,
  UTXOS_WITH_INSCRIPTION_RESPONSE,
  UTXOS_WITH_RUNES_RESPONSE,
} from './maestro-bitcoin-api.fixtures';

import type {
  MaestroAddressMempoolUtxoResponse,
  MaestroAddressTransactionsResponse,
  MaestroInfoResponse,
  MaestroTransactionResponse,
} from '../../src/maestro';
import type { HttpRequestResponse } from '@lace-lib/util-provider';

const mockClient = {
  request: vi.fn(),
};

const queueResponse = <T>(value: T) => {
  mockClient.request.mockResolvedValueOnce(value);
};
const queueError = (error: unknown) => {
  mockClient.request.mockRejectedValueOnce(error);
};

describe('MaestroBitcoinProvider', () => {
  let provider: MaestroBitcoinProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    provider = new MaestroBitcoinProvider(mockClient as never, dummyLogger);
  });

  it('fetches last known block', async () => {
    queueResponse<HttpRequestResponse<MaestroInfoResponse>>(
      LAST_KNOWN_BLOCK_RESPONSE,
    );

    const result = await provider.getLastKnownBlock();
    expect(result).toEqual({
      height: 91417,
      hash: '0000000093e5007f7707265e758cfcd300e9937486401c40efa4f2c830124927',
    });

    expect(mockClient.request).toHaveBeenCalledWith(
      '/rpc/general/info',
      undefined,
    );
  });

  describe('getTransaction', () => {
    it('maps all fields correctly for a regular (non‑coinbase) tx', async () => {
      const txHash =
        'd34d329997dc02a0ce85496409c5c8f84d9a584d1d0db37fcef8e63005b3da20';
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(
        REGULAR_TX,
      );

      const tx = await provider.getTransaction(txHash);

      expect(tx.transactionHash).toBe(txHash);
      expect(tx.status).toBe(BitcoinTransactionStatus.Confirmed);
      expect(tx.confirmations).toBe(53);
      expect(tx.blockHeight).toBe(91_365);
      expect(tx.timestamp).toBe(1_752_657_796);

      expect(tx.inputs).toHaveLength(1);
      expect(tx.inputs[0]).toEqual({
        txId: '7f956f208d0e2d30d104facc0da518bda201d57ce6cc1b0e43213a3235b3b487',
        index: 1,
        address: 'tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d',
        satoshis: 632000,
        isCoinbase: false,
        coinbaseScript: '',
      });

      expect(tx.outputs).toHaveLength(2);

      expect(tx.outputs[0]).toEqual({
        address: 'tb1q9p6x5sr0djj77lde5u22xvv55pv024f4sz8pqj',
        satoshis: 31000,
      });

      expect(tx.outputs[1]).toEqual({
        address: 'tb1q4qkrnwpyqwmnckgjyzmq9zp2s9gvqzggt6pd3d',
        satoshis: 564000,
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        `/rpc/transaction/${txHash}`,
        { params: { verbose: true } },
      );
    });

    it('maps all fields correctly for a coinbase tx that includes an OP_RETURN output', async () => {
      const txHash =
        'b54956e439ac2607f0b0f9ff4354b3480fab45c8c12d361d098681a197fbd928';

      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(
        COINBASE_OP_RETURN_TX,
      );

      const tx = await provider.getTransaction(txHash);

      expect(tx.transactionHash).toBe(txHash);
      expect(tx.status).toBe(BitcoinTransactionStatus.Confirmed);
      expect(tx.confirmations).toBe(45);
      expect(tx.blockHeight).toBe(91_365);
      expect(tx.timestamp).toBe(1_752_657_796);

      expect(tx.inputs).toHaveLength(1);
      expect(tx.inputs[0]).toEqual({
        txId: '',
        index: 0,
        address: '',
        satoshis: 0,
        isCoinbase: true,
        coinbaseScript:
          '03e564010004606d776804d315960a0c04f77468cf020000000000000a636b706f6f6c062f4077697a2f',
      });

      expect(tx.outputs).toHaveLength(2);

      expect(tx.outputs[0]).toEqual({
        address: 'tb1q548z58kqvwyjqwy8vc2ntmg33d7s2wyfv7ukq4',
        satoshis: 5001742415,
        opReturnData: undefined,
      });

      expect(tx.outputs[1]).toEqual({
        address: '',
        satoshis: 0,
        opReturnData:
          'aa21a9ed2d18cabc5f4d190dd5c0056495ff7972b05e15ee3e753cc5f0b5a5935e72504a',
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        `/rpc/transaction/${txHash}`,
        { params: { verbose: true } },
      );
    });
  });

  describe('getTransactions', () => {
    it('get all transactions from an address', async () => {
      const address = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';

      queueResponse<HttpRequestResponse<MaestroAddressTransactionsResponse>>(
        ADDRESS_TXS_PAGE,
      );
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(TX_B59C44);
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(TX_D86865);
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(TX_F9D145);

      const { items: transactions, cursor } = await provider.getTransactions(
        address,
        { count: 3 },
      );

      expect(cursor).toBe(
        'AwE8bgEBqmsIjCdouqc2tlAsam8jikVZZRlFb9dqt5nq52GypWQ',
      );
      expect(transactions).toHaveLength(3);

      expect(transactions[0]).toMatchObject({
        transactionHash: TX_B59C44.data.data.txid,
        status: BitcoinTransactionStatus.Confirmed,
        blockHeight: 90_187,
        inputs: [
          {
            address,
            satoshis: 459781,
            isCoinbase: false,
          },
        ],
        outputs: [
          { address, satoshis: 10000 },
          { address, satoshis: 449592 },
          { address: '', satoshis: 0, opReturnData: 'e4bda0e5a5bd' },
        ],
      });

      expect(transactions[1]).toMatchObject({
        transactionHash: TX_D86865.data.data.txid,
        blockHeight: 90_176,
        inputs: [{ satoshis: 500000 }],
        outputs: [
          { satoshis: 10000 },
          { satoshis: 489811 },
          { opReturnData: '54657374204e6f7465' },
        ],
      });

      expect(transactions[2]).toMatchObject({
        transactionHash: TX_F9D145.data.data.txid,
        blockHeight: 90_173,
        inputs: [{ satoshis: 159562 }],
        outputs: [
          { satoshis: 10000 },
          { satoshis: 149207 },
          { opReturnData: '54657374204e6f7465' },
        ],
      });

      expect(mockClient.request).toHaveBeenNthCalledWith(
        1,
        `/addresses/${address}/txs`,
        { params: { count: 3, order: 'desc' } },
      );

      expect(mockClient.request).toHaveBeenNthCalledWith(
        2,
        `/rpc/transaction/b59c441717990c84eeebde12ac2a2434ca93c4cd0ab65908f6118e09e0ffaabc`,
        { params: { verbose: true } },
      );

      expect(mockClient.request).toHaveBeenNthCalledWith(
        3,
        `/rpc/transaction/d86865b8fb07781d85e46d17a8d41701aafe9d1ef186350816c3a77761012fdf`,
        { params: { verbose: true } },
      );

      expect(mockClient.request).toHaveBeenNthCalledWith(
        4,
        '/rpc/transaction/f9d1458a07f6a8b2353edfaead687304099ace1d1a668e0a918504bb41abc39e',
        { params: { verbose: true } },
      );
    });

    it('returns an empty array for 404', async () => {
      queueError(new HttpClientError(404, 'Not found'));

      const { items: transactions, cursor } = await provider.getTransactions(
        'missing',
      );
      expect(transactions).toEqual([]);
      expect(cursor).toBe('');

      expect(mockClient.request).toHaveBeenCalledWith(
        `/addresses/missing/txs`,
        { params: { count: 50, order: 'desc' } },
      );
    });
  });

  describe('getMempoolTransactions', () => {
    it('get all mempool transactions from an address', async () => {
      const address = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';

      queueResponse<HttpRequestResponse<MaestroAddressMempoolUtxoResponse>>(
        ADDRESS_MEMPOOL_TXS_PAGE,
      );
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(TX_58b595);
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(TX_E1502F);
      queueResponse<HttpRequestResponse<MaestroTransactionResponse>>(TX_B4EA3A);

      const { items: transactions } = await provider.getTransactionsInMempool(
        address,
        { count: 3 },
      );

      expect(transactions).toHaveLength(2);

      expect(transactions[0]).toMatchObject({
        transactionHash: TX_58b595.data.data.txid,
        status: BitcoinTransactionStatus.Pending,
        blockHeight: 0,
        inputs: [
          {
            address,
            satoshis: 100000,
            isCoinbase: false,
          },
        ],
        outputs: [
          {
            address: 'tb1qgjja2kwzpjgeqmqrxk5kygg2x0c7zax5zs6hhy',
            satoshis: 2330,
          },
          { address, satoshis: 97523 },
        ],
      });

      expect(transactions[1]).toMatchObject({
        transactionHash: TX_E1502F.data.data.txid,
        blockHeight: 0,
        inputs: [{ satoshis: 123557 }],
        outputs: [
          { address, satoshis: 2300 },
          {
            address: 'tb1qlqeamflxn4fjr6phlp9wns4sw7l009aggd0x92',
            satoshis: 121110,
          },
        ],
      });

      expect(mockClient.request).toHaveBeenNthCalledWith(
        1,
        `/mempool/addresses/${address}/utxos`,
        { params: { count: 3, order: 'desc' } },
      );

      expect(mockClient.request).toHaveBeenNthCalledWith(
        2,
        `/rpc/transaction/58b595701ad46238313fbab7c9a90d853a8bf10d11d526c7747d5993e0f20d9e`,
        { params: { verbose: true } },
      );

      expect(mockClient.request).toHaveBeenNthCalledWith(
        3,
        `/rpc/transaction/e1502f80b9d0bd97969bb7b8a60a41b3115a5b584c50a0ea0ef378c528b00a46`,
        { params: { verbose: true } },
      );
    });

    it('returns an empty array for 404', async () => {
      queueError(new HttpClientError(404, 'Not found'));

      const { items: transactions, cursor } =
        await provider.getTransactionsInMempool('missing');
      expect(transactions).toEqual([]);
      expect(cursor).toBe('');

      expect(mockClient.request).toHaveBeenCalledWith(
        `/mempool/addresses/missing/utxos`,
        { params: { order: 'desc' } },
      );
    });
  });

  describe('getUTxOs', () => {
    it('maps simple UTXOs correctly', async () => {
      const address = 'tb1qwj666s6uktl2q5am0uej008usfsg93fgrwjuuf';

      queueResponse(UTXOS_RESPONSE);

      const { items: utxos } = await provider.getUTxOs(address);

      expect(mockClient.request).toHaveBeenCalledWith(
        `/addresses/${address}/utxos`,
        { params: {} },
      );

      expect(utxos).toHaveLength(4);

      const expected = [
        {
          txId: '58b595701ad46238313fbab7c9a90d853a8bf10d11d526c7747d5993e0f20d9e',
          index: 0,
          address,
          satoshis: 20000,
          confirmations: 11_706,
          height: 79_782,
          script: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
          inscriptions: [],
          runes: [],
        },
        {
          txId: '4f650da7349fcbf176f3806f692010c6d50c27595e04c3306abd908efecd1db6',
          index: 0,
          address,
          satoshis: 2300,
          confirmations: 11_247,
          height: 80_241,
          script: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
          inscriptions: [],
          runes: [],
        },
        {
          txId: 'e1502f80b9d0bd97969bb7b8a60a41b3115a5b584c50a0ea0ef378c528b00a46',
          index: 1,
          address,
          satoshis: 97523,
          confirmations: 10_959,
          height: 80_529,
          script: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
          inscriptions: [],
          runes: [],
        },
        {
          txId: 'b4ea3ad122c3a5fce9d11c44abbbfab560a4e52e36298335ba0e67aa63ab5123',
          index: 1,
          address,
          satoshis: 55062,
          confirmations: 10_949,
          height: 80_539,
          script: '001474b5ad435cb2fea053bb7f3327bcfc826082c528',
          inscriptions: [],
          runes: [],
        },
      ];

      expect(utxos).toEqual(expected);
    });

    it('maps a UTXO that carries an inscription', async () => {
      queueResponse(UTXOS_WITH_INSCRIPTION_RESPONSE);

      const address =
        'tb1psaf4er4pj6r5u54ptq7d55d0mydax3cyt2mrttvyzqqktpyvye5q9cvd9g';

      const { items: utxos } = await provider.getUTxOs(address);

      expect(mockClient.request).toHaveBeenCalledWith(
        `/addresses/${address}/utxos`,
        { params: {} },
      );

      expect(utxos).toHaveLength(1);

      const expected = {
        txId: '0d6f0c08adcc07fe6e09aaf952455e7d9ca2fc94f71975efd3946533e7225fcb',
        index: 0,
        address,
        satoshis: 546,
        confirmations: 1_039,
        height: 90_446,
        script:
          '512087535c8ea196874e52a1583cda51afd91bd347045ab635ad84100165848c2668',
        inscriptions: [
          {
            inscriptionId:
              '0d6f0c08adcc07fe6e09aaf952455e7d9ca2fc94f71975efd3946533e7225fcbi0',
            offset: 0,
          },
        ],
        runes: [],
      };

      expect(utxos[0]).toEqual(expected);
    });

    it('maps a UTXO that carries runes', async () => {
      queueResponse(UTXOS_WITH_RUNES_RESPONSE);

      const address =
        'tb1pn9dzakm6egrv90c9gsgs63axvmn6ydwemrpuwljnmz9qdk38ueqsqae936';

      const { items: utxos } = await provider.getUTxOs(address);

      expect(mockClient.request).toHaveBeenCalledWith(
        `/addresses/${address}/utxos`,
        { params: {} },
      );

      expect(utxos).toHaveLength(1);

      const expected = {
        txId: '63937d48e35d15a7c5530469210c202104cc94a945cc848554f336b3f4f24121',
        index: 1,
        address,
        script:
          '5120995a2edb7aca06c2bf0544110d47a666e7a235d9d8c3c77e53d88a06da27e641',
        satoshis: 10000,
        confirmations: 60_924,
        height: 30_562,
        inscriptions: [],
        runes: [{ runeId: '30562:50', amount: '1.00000000' }],
      };

      expect(utxos[0]).toEqual(expected);

      const runeUtxo = utxos[0];
      expect(runeUtxo.runes).toEqual([
        { runeId: '30562:50', amount: '1.00000000' },
      ]);
      expect(runeUtxo.inscriptions).toHaveLength(0);
      expect(runeUtxo.satoshis).toBe(10_000);
    });

    it('returns an empty array for 404', async () => {
      queueError(new HttpClientError(404, 'Not found'));

      const { items: transactions, cursor } = await provider.getUTxOs(
        'missing',
      );
      expect(transactions).toEqual([]);
      expect(cursor).toBe('');

      expect(mockClient.request).toHaveBeenCalledWith(
        `/addresses/missing/utxos`,
        { params: {} },
      );
    });
  });

  describe('getTransactionStatus', () => {
    it('returns confirmed for transactions with positive confirmations', async () => {
      queueResponse(TX_F9D145);

      const status = await provider.getTransactionStatus('someHash');
      expect(status).toBe(BitcoinTransactionStatus.Confirmed);

      expect(mockClient.request).toHaveBeenCalledWith(
        `/rpc/transaction/someHash`,
        { params: { verbose: true } },
      );
    });

    it('returns pending for transactions with 0 confirmations', async () => {
      const transactionsResponse = { ...TX_F9D145 };
      transactionsResponse.data.data.confirmations = 0;

      queueResponse(transactionsResponse);

      const status = await provider.getTransactionStatus('someHash');
      expect(status).toBe(BitcoinTransactionStatus.Pending);

      expect(mockClient.request).toHaveBeenCalledWith(
        `/rpc/transaction/someHash`,
        { params: { verbose: true } },
      );
    });

    it('returns status as Dropped for 404', async () => {
      queueError(new HttpClientError(404, 'Not found'));

      const status = await provider.getTransactionStatus('someHash');
      expect(status).toBe(BitcoinTransactionStatus.Dropped);

      expect(mockClient.request).toHaveBeenCalledWith(
        `/rpc/transaction/someHash`,
        { params: { verbose: true } },
      );
    });
  });

  describe('estimateFee', () => {
    it('returns estimated fees', async () => {
      queueResponse(FEE_ESTIMATION_RESPONSE);

      const { feeRate, targetConfirmationTime } = await provider.estimateFee(
        3,
        BitcoinFeeEstimationMode.Conservative,
      );

      expect(feeRate).toBe(0.00022);
      expect(targetConfirmationTime).toBe(3);

      expect(mockClient.request).toHaveBeenCalledWith(
        '/rpc/transaction/estimatefee/3',
        {
          params: {
            mode: 'conservative',
          },
        },
      );
    });

    it('throws error when invalid response', async () => {
      queueResponse(FEE_ESTIMATION_INVALID_RESPONSE);

      await expect(
        provider.estimateFee(3, BitcoinFeeEstimationMode.Conservative),
      ).rejects.toThrow();

      expect(mockClient.request).toHaveBeenCalledWith(
        '/rpc/transaction/estimatefee/3',
        {
          params: {
            mode: 'conservative',
          },
        },
      );
    });
  });

  describe('submitTransaction', () => {
    it('return tx hash when tx submission succeeds', async () => {
      queueResponse(TX_SUBMIT_SUCCESS);

      const txHash = await provider.submitTransaction('some_tx');

      expect(txHash).toBe(
        '81706c94558b5e09619b3b1204de069e3aaa90f01dd01a7c7345647310012a8e',
      );
      expect(mockClient.request).toHaveBeenCalledWith(
        '/rpc/transaction/submit',
        {
          body: '"some_tx"',
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      );
    });
  });
});
