import { PREVIEW_REALFI_CONFIG } from '@lace-contract/realfi-staking';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The SDK root transitively imports `@sundaeswap/core`'s ESM build, which uses
// node-ESM-incompatible directory imports (see realfi-provider.test.ts) — mock
// the seam so this stays unit-testable without loading the SDK.
const getOrdersByOwner = vi.fn(
  async (_address?: unknown, _statuses?: string[]): Promise<unknown[]> => [],
);
vi.mock('@realfi-co/realfi-partner-sdk', () => ({
  RealfiApi: {
    forNetwork: vi.fn(() => ({ getOrdersByOwner })),
  },
}));

import {
  fetchCancelableRealFiOrderReferences,
  fetchCoolingDownUnstakes,
  fetchWithdrawableUnstakes,
  getStakeHistory,
} from '../src/realfi-stake-activities';

// Most cases assert only the rows; the bonus evidence has its own tests.
const getStakeActivities = async (
  params: Parameters<typeof getStakeHistory>[0],
) => (await getStakeHistory(params)).activities;

// The executed-orders read is memoized per (network, address) for a few
// seconds (one sweep = one read) — each test uses a distinct address so a
// cached read never leaks into the next test's mock.
const addressCounter = { value: 0 };
const nextStakerAddr = () => `addr_test1_staker_${(addressCounter.value += 1)}`;
const TIMELOCK_ADDR = 'addr_test1_timelock';
const BLOCKFROST = { baseUrl: 'https://proxy.example/extension/preview' };
const API_BASE = `${BLOCKFROST.baseUrl}/api/v0`;
// Preview, so every ADA ticker below reads `tADA` — `knownTickers` follows
// the network like the rest of the app. See the mainnet case at the end.
const CONFIG = PREVIEW_REALFI_CONFIG;
const TIP_SLOT = 10_000;

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body } as never);

/** fetch stub routing the Blockfrost paths each fetcher hits (prefix match, so
 * paginated `?count=&page=` query strings still route to their base path). */
const stubFetch = (
  routes: Record<string, () => unknown>,
): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn(async (url: string) => {
    for (const [path, body] of Object.entries(routes)) {
      if (url.startsWith(`${API_BASE}${path}`)) return okJson(body());
    }
    throw new Error(`Unrouted fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const executedUnstake = (overrides: Record<string, unknown> = {}) => ({
  action: 'Unstake',
  status: 'Executed',
  amount: '1500000', // the sUSDr deposit — NOT what the timelock pays out
  unlockSlot: '5000',
  slot: '4000',
  utxo: { txHash: 'order-tx', outputIndex: 0 },
  resultUtxo: { txHash: 'aa', outputIndex: 0 },
  ...overrides,
});

const timelockUtxosBody = (usdrQuantity: string) => ({
  outputs: [
    {
      output_index: 0,
      address: TIMELOCK_ADDR,
      amount: [
        { unit: 'lovelace', quantity: '1200000' },
        { unit: CONFIG.usdrTokenId, quantity: usdrQuantity },
      ],
    },
  ],
});

afterEach(() => {
  vi.unstubAllGlobals();
  getOrdersByOwner.mockReset();
  getOrdersByOwner.mockResolvedValue([]);
});

describe('fetchWithdrawableUnstakes', () => {
  it('reports the timelock UTxO’s USDr — what the claim pays — not the sUSDr deposit', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([executedUnstake()]);
    stubFetch({
      '/blocks/latest': () => ({ slot: TIP_SLOT }),
      '/txs/aa/utxos': () => timelockUtxosBody('1530000'),
      [`/addresses/${TIMELOCK_ADDR}/utxos`]: () => [
        { tx_hash: 'aa', output_index: 0 },
      ],
    });

    const result = await fetchWithdrawableUnstakes(
      CONFIG,
      stakerAddr,
      BLOCKFROST,
    );

    expect(result).toEqual([
      {
        timelockUtxo: { txHash: 'aa', index: 0 },
        unlockSlot: 5000,
        usdrAmount: '1530000',
      },
    ]);
  });

  it('keeps the sUSDr deposit as a lower-bound fallback when the UTxO read fails', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([executedUnstake()]);
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${API_BASE}/blocks/latest`)
        return okJson({ slot: TIP_SLOT });
      return { ok: false, status: 500 } as never;
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWithdrawableUnstakes(
      CONFIG,
      stakerAddr,
      BLOCKFROST,
    );

    // Transient error → candidate kept (don't hide a claimable), fallback amount.
    expect(result).toEqual([
      {
        timelockUtxo: { txHash: 'aa', index: 0 },
        unlockSlot: 5000,
        usdrAmount: '1500000',
      },
    ]);
  });

  it('throws when the order read fails, so the store keeps previous data instead of a false empty', async () => {
    getOrdersByOwner.mockRejectedValue(new Error('realfi api down'));
    stubFetch({ '/blocks/latest': () => ({ slot: TIP_SLOT }) });

    await expect(
      fetchWithdrawableUnstakes(CONFIG, nextStakerAddr(), BLOCKFROST),
    ).rejects.toThrow('realfi api down');
    await expect(
      fetchCoolingDownUnstakes(CONFIG, nextStakerAddr(), BLOCKFROST),
    ).rejects.toThrow('realfi api down');
  });

  it('pages through the address UTxOs so an unspent timelock past page 1 is not read as spent', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([executedUnstake()]);
    // The timelock UTxO 'aa#0' is on the SECOND page: a single-page read would
    // miss it and drop the (still-claimable) unstake.
    const page1 = Array.from({ length: 100 }, (_, index) => ({
      tx_hash: `other-${index}`,
      output_index: 0,
    }));
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith(`${API_BASE}/blocks/latest`))
        return okJson({ slot: TIP_SLOT });
      if (url.startsWith(`${API_BASE}/txs/aa/utxos`))
        return okJson(timelockUtxosBody('1530000'));
      if (url.startsWith(`${API_BASE}/addresses/${TIMELOCK_ADDR}/utxos`))
        return okJson(
          url.includes('page=1') ? page1 : [{ tx_hash: 'aa', output_index: 0 }],
        );
      throw new Error(`Unrouted fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWithdrawableUnstakes(
      CONFIG,
      stakerAddr,
      BLOCKFROST,
    );

    expect(result).toHaveLength(1);
    expect(result[0].usdrAmount).toBe('1530000');
  });

  it('drops a timelock whose UTxO is already spent (claimed)', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([executedUnstake()]);
    stubFetch({
      '/blocks/latest': () => ({ slot: TIP_SLOT }),
      '/txs/aa/utxos': () => timelockUtxosBody('1530000'),
      [`/addresses/${TIMELOCK_ADDR}/utxos`]: () => [],
    });

    const result = await fetchWithdrawableUnstakes(
      CONFIG,
      stakerAddr,
      BLOCKFROST,
    );

    expect(result).toEqual([]);
  });
});

describe('getStakeActivities', () => {
  const USDR_SUNDAE_ID = `${CONFIG.usdrPolicyId}.55534472`;
  const OTHER_ID = 'deadbeef.aaaa';

  const sundaeSwap = (overrides: Record<string, unknown> = {}) => ({
    id: 'swap-1',
    createdAt: { slot: 100 },
    outcome: 'Executed',
    assets: [
      { asset: { id: 'ada.lovelace', ticker: 'ADA', decimals: 6 } },
      { asset: { id: USDR_SUNDAE_ID, ticker: 'USDr', decimals: 6 } },
    ],
    details: {
      __typename: 'Swap',
      offer: { quantity: '5000000', asset: { id: 'ada.lovelace' } },
      received: { quantity: '1000000', asset: { id: USDR_SUNDAE_ID } },
    },
    ...overrides,
  });

  const stakeOrder = (slot: number, txHash: string) => ({
    action: 'Stake',
    status: 'Executed',
    amount: '1000000',
    slot: String(slot),
    utxo: { txHash, outputIndex: 0 },
  });

  const stubActivityFetch = (orders: unknown[]) => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${API_BASE}/blocks/latest`)
        return okJson({ slot: TIP_SLOT });
      if (url === CONFIG.sundaeApiUrl)
        // Single page: empty cursor ends the walk.
        return okJson({
          data: { portfolio: { ordersPaginated: { cursor: '', orders } } },
        });
      throw new Error(`Unrouted fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  };

  it('excludes swaps that do not target USDr — unrelated trading is not staking history', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([
      sundaeSwap({
        id: 'unrelated',
        assets: [
          { asset: { id: 'ada.lovelace', ticker: 'ADA', decimals: 6 } },
          { asset: { id: OTHER_ID, ticker: 'OTH', decimals: 6 } },
        ],
        details: {
          __typename: 'Swap',
          offer: { quantity: '5000000', asset: { id: 'ada.lovelace' } },
          received: { quantity: '42', asset: { id: OTHER_ID } },
        },
      }),
      sundaeSwap({ id: 'usdr-swap' }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result.map(row => row.id)).toEqual(['usdr-swap']);
  });

  it('keeps valid swap and direct-stake history when a cancelled Sundae order has null details', async () => {
    getOrdersByOwner.mockResolvedValue([stakeOrder(90, 'direct-stake')]);
    stubActivityFetch([
      sundaeSwap({ id: 'valid-swap' }),
      sundaeSwap({
        id: 'cancelled-order',
        outcome: 'Cancelled',
        details: null,
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: nextStakerAddr(),
      blockfrost: BLOCKFROST,
    });

    expect(result.map(row => row.id)).toEqual(['valid-swap', 'direct-stake#0']);
    expect(result[1].completed).toBe(true);
  });

  it('keeps the routed stake and the direct stake as their own rows in captured mainnet history', async () => {
    // Captured mainnet response shape: a swap→stake settling straight into its
    // 9.995 USDr stake order, an earlier plain USDCx→USDr swap paid back to the
    // wallet, a later direct 9 USDr stake of those funds, and a cancelled
    // null-details row.
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      { ...stakeOrder(199_472_247, 'direct-stake'), amount: '9000000' },
      { ...stakeOrder(199_471_981, 'routed-stake'), amount: '9995000' },
    ]);
    const swap = ({
      slot,
      received,
      ...overrides
    }: {
      id: string;
      slot: number;
      received: string;
      spentTxHash: string;
      destination: { address: string };
    }) =>
      sundaeSwap({
        createdAt: { slot },
        details: {
          __typename: 'Swap',
          offer: { quantity: '10000000', asset: { id: OTHER_ID } },
          received: { quantity: received, asset: { id: USDR_SUNDAE_ID } },
        },
        ...overrides,
      });
    stubActivityFetch([
      swap({
        id: 'new-swap#1',
        slot: 199_471_981,
        received: '9995000',
        spentTxHash: 'routed-stake',
        destination: { address: 'addr1w-realfi-order-script' },
      }),
      swap({
        id: 'old-swap#0',
        slot: 199_408_011,
        received: '9000000',
        spentTxHash: 'plain-swap-payout',
        destination: { address: stakerAddr },
      }),
      sundaeSwap({ outcome: 'Cancelled', details: null }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
    });

    expect(
      result.map(({ id, kind, stakeOrderTxHash, completed }) => ({
        id,
        kind,
        stakeOrderTxHash,
        completed,
      })),
    ).toEqual([
      {
        id: 'direct-stake#0',
        kind: 'stake',
        stakeOrderTxHash: undefined,
        completed: true,
      },
      {
        id: 'new-swap#1',
        kind: 'swap',
        stakeOrderTxHash: 'routed-stake',
        completed: true,
      },
    ]);
  });

  it('pairs a swap with the stake order its spentTxHash names over an earlier same-amount order', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      stakeOrder(150, 'same-amount-direct'),
      stakeOrder(200, 'settling-order'),
    ]);
    stubActivityFetch([
      sundaeSwap({ createdAt: { slot: 100 }, spentTxHash: 'settling-order' }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result.find(row => row.id === 'swap-1')).toHaveProperty(
      'stakeOrderTxHash',
      'settling-order',
    );
    expect(result.map(row => row.id)).toContain('same-amount-direct#0');
    expect(result.map(row => row.id)).not.toContain('settling-order#0');
  });

  it("never lets one swap's fallback claim the order another swap settled into", async () => {
    // The newer swap (batcher flow) has no exact link; its amount fallback
    // would take 'older-settled', which the older swap settled into exactly.
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      stakeOrder(150, 'older-settled'),
      stakeOrder(400, 'newer-batched'),
    ]);
    stubActivityFetch([
      sundaeSwap({ id: 'newer-swap', createdAt: { slot: 120 } }),
      sundaeSwap({
        id: 'older-swap',
        createdAt: { slot: 100 },
        spentTxHash: 'older-settled',
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    const pairs = Object.fromEntries(
      result.map(row => [row.id, row.stakeOrderTxHash]),
    );
    expect(pairs).toEqual({
      'older-swap': 'older-settled',
      'newer-swap': 'newer-batched',
    });
  });

  it('falls back to amount and slot when the settling tx is not a RealFi order', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([stakeOrder(150, 'batcher-order')]);
    stubActivityFetch([sundaeSwap({ spentTxHash: 'scoop-payout' })]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('stakeOrderTxHash', 'batcher-order');
  });

  it('tells apart two swaps scooped in the same tx by their stake amounts', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      { ...stakeOrder(150, 'shared-scoop'), amount: '2000000' },
      {
        ...stakeOrder(150, 'shared-scoop'),
        amount: '1000000',
        utxo: { txHash: 'shared-scoop', outputIndex: 1 },
      },
    ]);
    const swapReceiving = (id: string, quantity: string) =>
      sundaeSwap({
        id,
        spentTxHash: 'shared-scoop',
        details: {
          __typename: 'Swap',
          offer: { quantity: '5000000', asset: { id: 'ada.lovelace' } },
          received: { quantity, asset: { id: USDR_SUNDAE_ID } },
        },
      });
    stubActivityFetch([
      swapReceiving('small-swap', '1000000'),
      swapReceiving('large-swap', '2000000'),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    const staked = Object.fromEntries(
      result.map(row => [row.id, row.stakedUsdrBaseUnits]),
    );
    expect(staked).toEqual({
      'small-swap': '1000000',
      'large-swap': '2000000',
    });
  });

  describe('swaps settled in one transaction', () => {
    const settledSwap = (id: string, received: string) =>
      sundaeSwap({
        id,
        spentTxHash: 'shared-scoop',
        details: {
          __typename: 'Swap',
          offer: { quantity: '10000000', asset: { id: 'ada.lovelace' } },
          received: { quantity: received, asset: { id: USDR_SUNDAE_ID } },
        },
      });
    const settlementOrder = ({
      outputIndex,
      amount,
      status,
    }: {
      outputIndex: number;
      amount: string;
      status: string;
    }) => ({
      ...stakeOrder(150, 'shared-scoop'),
      status,
      amount,
      utxo: { txHash: 'shared-scoop', outputIndex },
    });
    const read = async (swapOrder: unknown[]) => {
      stubActivityFetch(swapOrder);
      return getStakeActivities({
        config: CONFIG,
        addressBech32: nextStakerAddr(),
        blockfrost: BLOCKFROST,
      });
    };

    it.each([
      ['the larger swap first', ['ten', 'nine-point-five']],
      ['the smaller swap first', ['nine-point-five', 'ten']],
    ])(
      'gives each swap its own exactly sized order when amounts overlap the band (%s)',
      async (_, order) => {
        getOrdersByOwner.mockResolvedValue([
          settlementOrder({
            outputIndex: 0,
            amount: '9500000',
            status: 'Canceled',
          }),
          settlementOrder({
            outputIndex: 1,
            amount: '10000000',
            status: 'Executed',
          }),
        ]);
        const swaps = {
          ten: settledSwap('ten', '10000000'),
          'nine-point-five': settledSwap('nine-point-five', '9500000'),
        };

        const rows = await read(
          order.map(id => swaps[id as keyof typeof swaps]),
        );

        expect(rows.find(row => row.id === 'ten')).toMatchObject({
          stakedUsdrBaseUnits: '10000000',
          completed: true,
        });
        expect(rows.find(row => row.id === 'nine-point-five')).toMatchObject({
          stakedUsdrBaseUnits: '9500000',
          completed: false,
        });
        expect(rows).toHaveLength(2);
      },
    );

    it('pairs equal amounts whose orders share an outcome', async () => {
      getOrdersByOwner.mockResolvedValue([
        settlementOrder({
          outputIndex: 0,
          amount: '5000000',
          status: 'Executed',
        }),
        settlementOrder({
          outputIndex: 1,
          amount: '5000000',
          status: 'Executed',
        }),
      ]);

      const rows = await read([
        settledSwap('first', '5000000'),
        settledSwap('second', '5000000'),
      ]);

      expect(rows.map(row => [row.id, row.completed])).toEqual(
        expect.arrayContaining([
          ['first', true],
          ['second', true],
        ]),
      );
      expect(rows).toHaveLength(2);
    });

    it('shows the orders, not a guessed pairing, when equal amounts have different outcomes', async () => {
      getOrdersByOwner.mockResolvedValue([
        settlementOrder({
          outputIndex: 0,
          amount: '5000000',
          status: 'Canceled',
        }),
        settlementOrder({
          outputIndex: 1,
          amount: '5000000',
          status: 'Executed',
        }),
      ]);

      const rows = await read([
        settledSwap('first', '5000000'),
        settledSwap('second', '5000000'),
      ]);

      expect(rows.every(row => row.kind === 'stake')).toBe(true);
      expect(rows.map(row => row.completed).sort()).toEqual([false, true]);
    });

    it('gives each order of one transaction its own row id', async () => {
      getOrdersByOwner.mockResolvedValue([
        settlementOrder({
          outputIndex: 0,
          amount: '5000000',
          status: 'Canceled',
        }),
        settlementOrder({
          outputIndex: 1,
          amount: '5000000',
          status: 'Executed',
        }),
      ]);

      const rows = await read([]);

      expect(rows.map(row => row.id).sort()).toEqual([
        'shared-scoop#0',
        'shared-scoop#1',
      ]);
    });

    it('pairs a lone order within the haircut band', async () => {
      getOrdersByOwner.mockResolvedValue([
        settlementOrder({
          outputIndex: 0,
          amount: '9700000',
          status: 'Executed',
        }),
      ]);

      const rows = await read([settledSwap('lone', '10000000')]);

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: 'lone',
        stakedUsdrBaseUnits: '9700000',
      });
    });

    it('never pairs a swap that settled into a RealFi tx with an unrelated later order', async () => {
      getOrdersByOwner.mockResolvedValue([
        settlementOrder({
          outputIndex: 0,
          amount: '2000000',
          status: 'Executed',
        }),
        stakeOrder(400, 'later-same-amount'),
      ]);

      const rows = await read([settledSwap('mismatch', '1000000')]);

      expect(rows.map(row => row.id)).not.toContain('mismatch');
      expect(rows.filter(row => row.kind === 'stake')).toHaveLength(2);
    });
  });

  it('marks a cancelled swap→stake as canceled instead of in progress', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([stakeOrder(150, 'unrelated-direct')]);
    stubActivityFetch([sundaeSwap({ outcome: 'Cancelled' })]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    const cancelled = result.find(row => row.id === 'swap-1');
    expect(cancelled?.completed).toBe(false);
    expect(cancelled?.steps).toEqual([
      { key: 'swap', status: 'canceled' },
      { key: 'stake', status: 'canceled' },
      { key: 'received', status: 'canceled' },
    ]);
    // A cancelled swap never pairs, so the same-amount direct stake keeps its row.
    expect(result.map(row => row.id)).toContain('unrelated-direct#0');
  });

  it('leaves out a plain swap into USDr paid back to the wallet', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([stakeOrder(150, 'later-direct')]);
    stubActivityFetch([
      sundaeSwap({
        createdAt: { slot: 100 },
        destination: { address: stakerAddr },
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result.map(row => row.id)).toEqual(['later-direct#0']);
  });

  it('treats a pending swap as USDr-bound from its `estimated` output, not asset membership', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([
      // Pending (received null), estimated output is USDr → staking swap in
      // flight. `assets` deliberately omits the USDr leg — the old
      // membership heuristic would have dropped this (NEW-7); `estimated`
      // classifies it correctly.
      sundaeSwap({
        id: 'pending-usdr',
        outcome: null,
        assets: [{ asset: { id: 'ada.lovelace', ticker: 'ADA', decimals: 6 } }],
        details: {
          __typename: 'Swap',
          offer: { quantity: '5000000', asset: { id: 'ada.lovelace' } },
          received: null,
          estimated: { quantity: '900000', asset: { id: USDR_SUNDAE_ID } },
        },
      }),
      // Pending, estimated output is a non-USDr asset → not staking activity.
      sundaeSwap({
        id: 'pending-sale',
        outcome: null,
        details: {
          __typename: 'Swap',
          offer: { quantity: '1000000', asset: { id: USDR_SUNDAE_ID } },
          received: null,
          estimated: { quantity: '42', asset: { id: OTHER_ID } },
        },
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result.map(row => row.id)).toEqual(['pending-usdr']);
    // Nothing has landed yet — only the offered side shows, never a "+0 USDr".
    expect(result[0].subtitle).toBe('-5 tADA');
  });

  it('treats a pending V4 intent as USDr-bound from its `minimum` when it carries no estimate', async () => {
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([
      sundaeSwap({
        id: 'pending-v4',
        outcome: null,
        details: {
          __typename: 'Swap',
          offer: { quantity: '5000000', asset: { id: 'ada.lovelace' } },
          received: null,
          estimated: null,
          minimum: { quantity: '4900000', asset: { id: USDR_SUNDAE_ID } },
        },
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: nextStakerAddr(),
      blockfrost: BLOCKFROST,
    });

    expect(result.map(row => row.id)).toEqual(['pending-v4']);
    // A V4 intent's quote is its floor.
    expect(result[0].quotedUsdrBaseUnits).toBe('4900000');
  });

  it('reads ADA, not tADA, on mainnet', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([sundaeSwap()]);

    const result = await getStakeActivities({
      config: { ...CONFIG, isMainnet: true },
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result[0].subtitle).toBe('+1 USDrf, -5 ADA');
  });

  it('adds the received line to the subtitle once the swap settles', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([sundaeSwap()]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result[0].subtitle).toBe('+1 USDrf, -5 tADA');
  });

  it('correlates a swap to the earliest stake order AFTER it, never an earlier same-amount order', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      stakeOrder(90, 'before-swap'),
      stakeOrder(150, 'after-swap'),
    ]);
    stubActivityFetch([sundaeSwap({ createdAt: { slot: 100 } })]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    // The slot-150 order is consumed by the swap row; the slot-90 order keeps
    // its own direct-stake row.
    const ids = result.map(row => row.id);
    expect(ids).toContain('swap-1');
    expect(ids).toContain('before-swap#0');
    expect(ids).not.toContain('after-swap#0');
  });

  it('merges a swap and its downstream stake into ONE row when the stake is the swap output minus the batcher haircut', async () => {
    // Live preprod data: ADA→USDr swap received 6_888_336 USDr, and the batcher
    // staked exactly 97% of it (6_681_686) 27 slots later. The old symmetric ±2%
    // match missed the 3% haircut, so the flow showed as two rows (the swap with
    // a stuck "stake: active" step + a separate completed "Stake" row).
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      {
        action: 'Stake',
        status: 'Executed',
        amount: '6681686',
        slot: '133199873',
        utxo: { txHash: 'downstream-stake', outputIndex: 0 },
      },
    ]);
    stubActivityFetch([
      sundaeSwap({
        id: 'ada-usdr-swap',
        createdAt: { slot: 133_199_846 },
        details: {
          __typename: 'Swap',
          offer: { quantity: '524234000', asset: { id: 'ada.lovelace' } },
          received: { quantity: '6888336', asset: { id: USDR_SUNDAE_ID } },
          estimated: { quantity: '6890000', asset: { id: USDR_SUNDAE_ID } },
        },
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    // Exactly one row (the swap), the downstream stake consumed into it, and its
    // full three-step progress advanced to completed.
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ada-usdr-swap');
    expect(result[0]).toHaveProperty('stakeOrderTxHash', 'downstream-stake');
    expect(result[0].steps).toEqual([
      { key: 'swap', status: 'completed' },
      { key: 'stake', status: 'completed' },
      { key: 'received', status: 'completed' },
    ]);
    // Detail sheet: Stake amount = the USDr actually staked (the order amount,
    // not the swap's received USDr); Swap value = the input token line.
    expect(result[0].stakedUsdrBaseUnits).toBe('6681686');
    // Quote amount = the swap's expected output, shown beside the staked one.
    expect(result[0].quotedUsdrBaseUnits).toBe('6890000');
    expect(result[0].swapInputLine).toBe('-524.234 tADA');
  });

  it("quotes a V4 swap's minimum when Sundae reports a zero estimated placeholder", async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([
      sundaeSwap({
        details: {
          __typename: 'Swap',
          offer: { quantity: '10000000', asset: { id: OTHER_ID } },
          received: { quantity: '9995000', asset: { id: USDR_SUNDAE_ID } },
          estimated: { quantity: '0', asset: { id: USDR_SUNDAE_ID } },
          minimum: { quantity: '9995000', asset: { id: USDR_SUNDAE_ID } },
        },
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result[0].quotedUsdrBaseUnits).toBe('9995000');
  });

  it('skips a malformed quote amount instead of failing the history read', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    stubActivityFetch([
      sundaeSwap({
        details: {
          __typename: 'Swap',
          offer: { quantity: '10000000', asset: { id: OTHER_ID } },
          received: { quantity: '9995000', asset: { id: USDR_SUNDAE_ID } },
          estimated: { quantity: '1.5e3', asset: { id: USDR_SUNDAE_ID } },
          minimum: { quantity: null, asset: { id: USDR_SUNDAE_ID } },
        },
      }),
    ]);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(result).toHaveLength(1);
  });

  it('follows the page cursor so a multi-page wallet keeps its full swap history', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);
    // A full first page (PAGE_LIMIT rows) with a next cursor, then a short
    // final page — the walk must fetch both and stop.
    const fullPage = Array.from({ length: 100 }, (_, index) =>
      sundaeSwap({ id: `p1-${index}`, createdAt: { slot: 1000 + index } }),
    );
    const cursors: string[] = [];
    const fetchMock = vi.fn(async (url: string, init?: { body?: string }) => {
      if (url === `${API_BASE}/blocks/latest`)
        return okJson({ slot: TIP_SLOT });
      if (url === CONFIG.sundaeApiUrl) {
        const cursor = (
          JSON.parse(init?.body ?? '{}') as { variables: { cursor: string } }
        ).variables.cursor;
        cursors.push(cursor);
        return okJson(
          cursor === ''
            ? {
                data: {
                  portfolio: {
                    ordersPaginated: { cursor: 'next', orders: fullPage },
                  },
                },
              }
            : {
                data: {
                  portfolio: {
                    ordersPaginated: {
                      cursor: '',
                      orders: [sundaeSwap({ id: 'p2-0' })],
                    },
                  },
                },
              },
        );
      }
      throw new Error(`Unrouted fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });

    expect(cursors).toEqual(['', 'next']);
    const ids = result.map(row => row.id);
    expect(ids).toContain('p1-0');
    expect(ids).toContain('p2-0');
  });
});

describe('getStakeActivities — status-generation split', () => {
  const stubEmptySundae = () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${API_BASE}/blocks/latest`)
        return okJson({ slot: TIP_SLOT });
      if (url === CONFIG.sundaeApiUrl)
        return okJson({
          data: { portfolio: { ordersPaginated: { cursor: '', orders: [] } } },
        });
      throw new Error(`Unrouted fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  };

  it('keeps the core history when a deployment rejects the 2.18 screening statuses (preprod regression)', async () => {
    // Mirrors the live preprod failure: its OrderStatus enum predates
    // HeldForScreening / InvalidatedBlockedScreening, so a request naming
    // them rejects — the core lifecycle history must still come back.
    getOrdersByOwner.mockImplementation(
      async (_address: unknown, statuses?: string[]) => {
        if (statuses?.includes('HeldForScreening')) {
          throw new Error(
            'RealFi API error: Variable "s" has invalid value HeldForScreening',
          );
        }
        return [
          {
            action: 'Stake',
            status: 'Executed',
            amount: '336820378',
            slot: 130_319_758n,
            utxo: { txHash: 'stake-tx', outputIndex: 1 },
          },
        ];
      },
    );
    stubEmptySundae();

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: nextStakerAddr(),
      blockfrost: BLOCKFROST,
    });

    expect(result.map(row => row.id)).toEqual(['stake-tx#1']);
  });

  it('shows Rejected and Failed stake orders as failed, not in progress', async () => {
    getOrdersByOwner.mockImplementation(
      async (_address: unknown, statuses?: string[]) =>
        statuses?.includes('Rejected')
          ? (['Rejected', 'Failed'] as const).map((status, index) => ({
              action: 'Stake',
              status,
              amount: '1000000',
              slot: 130_319_758n + BigInt(index),
              utxo: { txHash: `stake-${status}`, outputIndex: 0 },
            }))
          : [],
    );
    stubEmptySundae();

    const result = await getStakeActivities({
      config: CONFIG,
      addressBech32: nextStakerAddr(),
      blockfrost: BLOCKFROST,
    });

    expect(
      result.map(row => [row.id, row.steps.map(step => step.status)]),
    ).toEqual([
      ['stake-Failed#0', ['failed', 'failed']],
      ['stake-Rejected#0', ['failed', 'failed']],
    ]);
  });

  it('still throws (keep-previous-data) when the CORE status read fails', async () => {
    getOrdersByOwner.mockImplementation(
      async (_address: unknown, statuses?: string[]) => {
        if (statuses?.includes('Executed')) {
          throw new Error('realfi api down');
        }
        return [];
      },
    );
    stubEmptySundae();

    await expect(
      getStakeActivities({
        config: CONFIG,
        addressBech32: nextStakerAddr(),
        blockfrost: BLOCKFROST,
      }),
    ).rejects.toThrow('realfi api down');
  });
});

describe('fetchCoolingDownUnstakes', () => {
  it('reports the cooldown timelock’s USDr, fixed at execution, not the sUSDr deposit', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      executedUnstake({
        unlockSlot: '20000', // still locked vs tip 10 000
        resultUtxo: { txHash: 'bb', outputIndex: 0 },
      }),
    ]);
    stubFetch({
      '/blocks/latest': () => ({ slot: TIP_SLOT }),
      '/txs/bb/utxos': () => timelockUtxosBody('2040000'),
    });

    const result = await fetchCoolingDownUnstakes(
      CONFIG,
      stakerAddr,
      BLOCKFROST,
    );

    expect(result).toHaveLength(1);
    expect(result[0].unlockSlot).toBe(20_000);
    expect(result[0].usdrAmount).toBe('2040000');
  });

  it('falls back to the sUSDr deposit when the order has no result UTxO yet', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      executedUnstake({ unlockSlot: '20000', resultUtxo: undefined }),
    ]);
    stubFetch({ '/blocks/latest': () => ({ slot: TIP_SLOT }) });

    const result = await fetchCoolingDownUnstakes(
      CONFIG,
      stakerAddr,
      BLOCKFROST,
    );

    expect(result).toHaveLength(1);
    expect(result[0].usdrAmount).toBe('1500000');
  });
});

describe('fetchCancelableRealFiOrderReferences', () => {
  const pendingOrder = (txHash: string, index: number) => ({
    action: 'Stake',
    status: 'Open',
    amount: '1',
    slot: 1n,
    utxo: { txHash, outputIndex: index },
  });

  it('returns refs for Open + Validating orders and tolerates a screening-status failure', async () => {
    getOrdersByOwner.mockImplementation(
      async (_address: unknown, statuses?: string[]) => {
        // The 2.18 screening status is rejected by an older deployment.
        if (statuses?.includes('HeldForScreening')) {
          throw new Error('invalid OrderStatus HeldForScreening');
        }
        expect(statuses).toEqual(['Open', 'Validating']);
        return [pendingOrder('tx-open', 0), pendingOrder('tx-val', 1)];
      },
    );

    const references = await fetchCancelableRealFiOrderReferences(
      CONFIG,
      nextStakerAddr(),
    );

    expect(references).toEqual([
      { txHash: 'tx-open', index: 0 },
      { txHash: 'tx-val', index: 1 },
    ]);
  });

  it('includes Rejected orders — never processed automatically, still owner-cancellable', async () => {
    getOrdersByOwner.mockImplementation(
      async (_address: unknown, statuses?: string[]) =>
        statuses?.includes('Rejected')
          ? [pendingOrder('tx-rejected', 2)]
          : [pendingOrder('tx-open', 0)],
    );

    expect(
      await fetchCancelableRealFiOrderReferences(CONFIG, nextStakerAddr()),
    ).toEqual([
      { txHash: 'tx-open', index: 0 },
      { txHash: 'tx-rejected', index: 2 },
    ]);
  });

  it('returns [] when the core lookup fails (no unsafe cancel)', async () => {
    getOrdersByOwner.mockRejectedValue(new Error('realfi api down'));
    expect(
      await fetchCancelableRealFiOrderReferences(CONFIG, nextStakerAddr()),
    ).toEqual([]);
  });
});

describe('getStakeHistory first-swap bonus evidence', () => {
  const USDR_SUNDAE_ID = `${CONFIG.usdrPolicyId}.55534472`;
  const swapInto = (
    receiveAssetId: string,
    overrides: Record<string, unknown> = {},
  ) => ({
    id: 'swap-1',
    createdAt: { slot: 100 },
    outcome: 'Executed',
    assets: [],
    details: {
      __typename: 'Swap',
      offer: { quantity: '5000000', asset: { id: 'ada.lovelace' } },
      received: { quantity: '1000000', asset: { id: receiveAssetId } },
    },
    ...overrides,
  });
  const readWith = async (sundaeOrders: unknown[], stakerAddr: string) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === `${API_BASE}/blocks/latest`)
          return okJson({ slot: TIP_SLOT });
        if (url === CONFIG.sundaeApiUrl)
          return okJson({
            data: {
              portfolio: {
                ordersPaginated: { cursor: '', orders: sundaeOrders },
              },
            },
          });
        throw new Error(`Unrouted fetch: ${url}`);
      }),
    );
    return getStakeHistory({
      config: CONFIG,
      addressBech32: stakerAddr,
      blockfrost: BLOCKFROST,
    });
  };

  it('counts a plain swap into USDr that is left out of the history', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([]);

    const history = await readWith(
      [swapInto(USDR_SUNDAE_ID, { destination: { address: stakerAddr } })],
      stakerAddr,
    );

    expect(history).toEqual({ activities: [], hasSwappedIntoUsdr: true });
  });

  it('counts a swap→stake whose row is dropped as unprovable', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      {
        action: 'Stake',
        status: 'Executed',
        amount: '2000000',
        slot: '150',
        utxo: { txHash: 'settlement', outputIndex: 0 },
      },
    ]);

    const history = await readWith(
      [swapInto(USDR_SUNDAE_ID, { spentTxHash: 'settlement' })],
      stakerAddr,
    );

    expect(history.activities.map(row => row.kind)).toEqual(['stake']);
    expect(history.hasSwappedIntoUsdr).toBe(true);
  });

  it('does not count a swap into another asset or a direct USDr stake', async () => {
    const stakerAddr = nextStakerAddr();
    getOrdersByOwner.mockResolvedValue([
      {
        action: 'Stake',
        status: 'Executed',
        amount: '1000000',
        slot: '150',
        utxo: { txHash: 'direct', outputIndex: 0 },
      },
    ]);

    const history = await readWith([swapInto('deadbeef.aaaa')], stakerAddr);

    expect(history.activities.map(row => row.id)).toEqual(['direct#0']);
    expect(history.hasSwappedIntoUsdr).toBe(false);
  });
});
