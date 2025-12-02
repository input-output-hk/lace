/* eslint-disable no-magic-numbers, no-loop-func, @typescript-eslint/no-non-null-assertion, unicorn/consistent-function-scoping, @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires, camelcase */
import { MaestroBitcoinDataProvider } from '../src/wallet/lib/providers/MaestroBitcoinDataProvider';
import { TransactionStatus, FeeEstimationMode } from '../src/wallet/lib/providers/BitcoinDataProvider';
import { Network } from '../src/wallet/lib/common';

describe('MaestroBitcoinDataProvider', () => {
  let provider: MaestroBitcoinDataProvider;
  let mockAxios: any;
  let mockCache: any;
  let mockLogger: any;

  const mockTxDetails = {
    vin: [{ txid: 'abc', vout: 0, address: 'addr1', value: '0.0001' }],
    vout: [{ address: 'addr2', value: '0.00009' }],
    confirmations: 5,
    blockheight: 100_000,
    blocktime: 1_696_969_696
  };

  beforeEach(() => {
    mockAxios = {
      get: jest.fn(),
      post: jest.fn()
    };

    mockCache = {
      get: jest.fn(),
      set: jest.fn()
    };

    mockLogger = {
      debug: jest.fn()
    };

    jest.spyOn(require('axios'), 'create').mockReturnValue(mockAxios);

    provider = new MaestroBitcoinDataProvider('dummy-token', mockCache, mockLogger, Network.Mainnet);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches last known block', async () => {
    mockAxios.get.mockResolvedValue({ data: { last_updated: { block_height: 100, block_hash: 'abc123' } } });

    const result = await provider.getLastKnownBlock();
    expect(result).toEqual({ height: 100, hash: 'abc123' });
  });

  it('fetches transaction details', async () => {
    const txHash = 'tx123';
    const txDetails = {
      vin: [{ txid: 'prevTx', vout: 0, address: 'addr1', value: '0.0001' }],
      vout: [{ address: 'addr2', value: '0.00009' }],
      confirmations: 10,
      blockheight: 500,
      blocktime: 1_234_567
    };

    mockCache.get.mockResolvedValue();
    mockAxios.get.mockResolvedValue({ data: { data: txDetails } });

    const result = await provider.getTransaction(txHash);
    expect(result.transactionHash).toBe(txHash);
    expect(result.status).toBe(TransactionStatus.Confirmed);
    expect(result.inputs[0].address).toBe('addr1');
    expect(result.outputs[0].address).toBe('addr2');
  });

  it('fetches transaction history with pagination', async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: { data: [{ tx_hash: 'tx1' }], next_cursor: 'next-cursor' } })
      .mockResolvedValueOnce({ data: { data: mockTxDetails } });

    mockCache.get.mockResolvedValue();

    const result = await provider.getTransactions('addr1');
    expect(result.transactions.length).toBe(1);
    expect(result.transactions[0].transactionHash).toBe('tx1');
    expect(result.nextCursor).toBe('next-cursor');
  });

  it('fetches mempool transactions', async () => {
    mockAxios.get
      .mockResolvedValueOnce({ data: { data: [{ txid: 'tx-mempool', mempool: true }] } })
      .mockResolvedValueOnce({ data: { data: mockTxDetails } });

    mockCache.get.mockResolvedValue();

    const result = await provider.getTransactionsInMempool('addr1');
    expect(result.length).toBe(1);
    expect(result[0].transactionHash).toBe('tx-mempool');
    expect(result[0].status).toBe(TransactionStatus.Pending);
  });

  it('fetches UTXOs', async () => {
    const utxoData = [{ txid: 'abc', vout: 0, satoshis: '10000', address: 'addr1' }];
    mockAxios.get.mockResolvedValue({ data: { data: utxoData } });

    const result = await provider.getUTxOs('addr1');
    expect(result[0].txId).toBe('abc');
    expect(result[0].address).toBe('addr1');
    expect(typeof result[0].satoshis).toBe('bigint');
  });

  it('submits transaction and returns hash', async () => {
    mockAxios.post.mockResolvedValue({ status: 201, data: 'txhash123' });

    const result = await provider.submitTransaction('rawtx');
    expect(result).toBe('txhash123');
  });

  it('returns status as Confirmed', async () => {
    mockAxios.get.mockResolvedValue({ data: { confirmations: 3 } });

    const result = await provider.getTransactionStatus('tx1');
    expect(result).toBe(TransactionStatus.Confirmed);
  });

  it('returns status as Dropped for 404', async () => {
    mockAxios.get.mockRejectedValue({ response: { status: 404 } });

    const result = await provider.getTransactionStatus('tx404');
    expect(result).toBe(TransactionStatus.Dropped);
  });

  it('estimates fees', async () => {
    mockAxios.get.mockResolvedValue({ status: 200, data: { data: { feerate: 22, blocks: 3 } } });

    const result = await provider.estimateFee(3, FeeEstimationMode.Conservative);
    expect(result.feeRate).toBe(22);
    expect(result.blocks).toBe(3);
  });
});
