/**
 * Builds the USDr staking history for an account by merging two order sources,
 * sorted by slot, newest first:
 *
 *  1. RealFi orders — the partner SDK's off-chain API
 *     (`RealfiApi.forNetwork(network).getOrdersByOwner(address, statuses)`,
 *     bech32-keyed, deriving the owner key hashes internally; explicit status
 *     lists split by schema generation — see CORE/SCREENING_ORDER_STATUSES)
 *     → Stake / Unstake / Mint / Redeem orders.
 *  2. SundaeSwap — `getSwapOrders(address)` keyed by the bech32 address → the
 *     USDCx/USDM→USDR swap legs (offer/received assets, Executed/pending).
 *
 * These reads pull the SDK's off-chain client (and its `@blaze-cardano/core`
 * dependency), which loads only under webpack (the service worker), not Metro.
 * They therefore run in the `RealFiProvider` (SW), behind the side-effect that
 * populates the store (ADR-19) — never directly in the Metro-bundled UI.
 */
import { getAdaTokenTickerByNetwork } from '@lace-contract/cardano-context';
import { realfiDebugLog } from '@lace-contract/realfi-staking';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { RealfiApi } from '@realfi-co/realfi-partner-sdk';

import {
  blockfrostRestBase,
  blockfrostRestHeaders,
  fetchChainTipSlot,
} from './realfi-blockfrost';
import { SUSDR_ASSET_NAME_HEX, USDR_ASSET_NAME_HEX } from './realfi-config';

import type { RealFiBlockfrostConfig } from './realfi-blockfrost';
import type { RealFiNetworkConfig } from './realfi-config';
import type {
  RealFiActivityStep,
  RealFiCoolingDownUnstake,
  RealFiStakeActivity,
  RealFiWithdrawableUnstake,
} from '@lace-contract/realfi-staking';
import type { IOrderInfo, TOrderStatus } from '@realfi-co/realfi-partner-sdk';

const DEFAULT_DECIMALS = 6;
// Sundae's maximum page size; `fetchSundaeSwaps` follows `OrdersPage.cursor`
// across pages up to MAX_SWAP_PAGES, so a multi-page wallet keeps its history.
const PAGE_LIMIT = 100;
/**
 * The batcher stakes a swap's USDr output minus a deterministic protocol
 * haircut (observed as exactly 3% on preprod for both ADA→USDr and USDCx→USDr)
 * plus any fees, so a swap's downstream stake order is ALWAYS ≤ the swap's
 * received USDr — never a symmetric neighbourhood. A "Stake" order whose amount
 * sits in `[received × (1 − STAKE_SWAP_MAX_HAIRCUT), received]` (with a small
 * rounding epsilon above) is treated as that swap's downstream leg — already
 * represented by the swap row — and merged into it. Anything else is a
 * directly-signed USDr stake and gets its own row. The band is wide enough to
 * absorb the haircut yet the amounts of distinct swaps stay well separated, so
 * an unrelated stake is not mis-merged (the slot-order + earliest-match +
 * consume-once guards below back this up).
 */
const STAKE_SWAP_MAX_HAIRCUT = 0.1;

/** SundaeSwap dot-form asset id for the network's USDr / sUSDr. */
const sundaeUsdrId = (config: RealFiNetworkConfig): string =>
  `${config.usdrPolicyId}.${USDR_ASSET_NAME_HEX}`;
const sundaeSusdrId = (config: RealFiNetworkConfig): string =>
  `${config.usdrPolicyId}.${SUSDR_ASSET_NAME_HEX}`;

/**
 * Asset id (SundaeSwap dot form) → ticker, for ids not present in the response.
 *
 * These take precedence over the order's own `asset.ticker`, so the ADA entry
 * has to be network-aware or a testnet row reads "ADA" while the rest of the
 * app reads "tADA".
 */
const knownTickers = (config: RealFiNetworkConfig): Record<string, string> => ({
  'ada.lovelace': getAdaTokenTickerByNetwork(
    config.isMainnet ? 'mainnet' : 'testnet',
  ),
  [sundaeUsdrId(config)]: 'USDrf',
  [sundaeSusdrId(config)]: 'sUSDrf',
});

export type GetStakeActivitiesParams = {
  config: RealFiNetworkConfig;
  /** The staker's bech32 address (Sundae key + source of the RealFi owner hash). */
  addressBech32: string;
  /** Lace's Blockfrost client config — the era-proof chain-tip time reference. */
  blockfrost?: RealFiBlockfrostConfig;
};

const slotToMs = (systemStartSeconds: number, slot: number): number =>
  (systemStartSeconds + slot) * 1000;

/**
 * Slot → wall-clock (ms), era-proof when the chain tip is known: the tip is
 * "now", and the slot delta is entirely inside the 1-second Shelley era. The
 * `systemStartSeconds` fallback (tip read failed) is ~19 days early on
 * preprod, whose Byron slots were 20s — display-grade only.
 */
const slotToWallClockMs = (
  config: RealFiNetworkConfig,
  slot: number,
  timeReference: { tipSlot: number | undefined; nowMs: number },
): number =>
  timeReference.tipSlot === undefined
    ? slotToMs(config.systemStartSeconds, slot)
    : timeReference.nowMs + (slot - timeReference.tipSlot) * 1000;

/**
 * Wall-clock (ms) the next cooldown period ends — the timelock an unstake
 * submitted now would carry (SDK `getCooldownUnlockSlot`, the backend's NEXT
 * `stakeTimes` boundary). Era-proof via the chain tip when available; throws
 * on SDK read failure so the provider maps it to `Err`.
 */
export const fetchCooldownUnlockMs = async (
  config: RealFiNetworkConfig,
  blockfrost?: RealFiBlockfrostConfig,
): Promise<number> => {
  const [unlockSlot, tipSlot] = await Promise.all([
    RealfiApi.forNetwork(config.realfiNetwork).getCooldownUnlockSlot(),
    blockfrost ? fetchTipSlotShared(blockfrost) : undefined,
  ]);
  return slotToWallClockMs(config, Number(unlockSlot), {
    tipSlot,
    nowMs: Date.now(),
  });
};

/**
 * Throws on transport/HTTP/GraphQL failure — the provider maps the throw to
 * `Err`, and the store's keep-previous-data path engages. Swallowing failures
 * into an empty result here would dispatch as a valid-empty read, wiping the
 * persisted history and hiding claimable funds on a transient outage.
 */
const graphql = async <T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as {
    data?: T;
    errors?: unknown;
  };
  if (!response.ok || json.errors || json.data === undefined) {
    throw new Error(
      `[RealFi] activities GraphQL error ${url}: status ${response.status}${
        json.errors ? ` errors ${JSON.stringify(json.errors)}` : ''
      }`,
    );
  }
  return json.data;
};

// --- RealFi orders (Stake / Unstake / …) — via the partner SDK off-chain API ---

/** A RealFi order UTxO reference (txHash + output index). */
type RealFiUtxoRef = { txHash: string; index: number };

/** The RealFi off-chain read client for a network (bech32-keyed; no Blaze). */
const realfiApi = (config: RealFiNetworkConfig) =>
  RealfiApi.forNetwork(config.realfiNetwork);

/**
 * One withdrawables sweep calls both `fetchWithdrawableUnstakes` and
 * `fetchCoolingDownUnstakes` per account, and `getStakeActivities` may run in
 * the same tick — each independently reading the executed orders and the
 * chain tip. Share the in-flight reads for a few seconds so a sweep costs one
 * orders read + one tip read per account instead of 2-3× each. Failures are
 * never cached (a rejected promise is evicted so the next call retries).
 */
const SWEEP_READ_TTL_MS = 10_000;
const memoized =
  <T>(cache: Map<string, { at: number; value: Promise<T> }>) =>
  async (key: string, read: () => Promise<T>): Promise<T> => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < SWEEP_READ_TTL_MS) {
      return cached.value;
    }
    const value = read();
    cache.set(key, { at: Date.now(), value });
    value.catch(() => cache.delete(key));
    return value;
  };
const executedOrdersMemo = memoized<IOrderInfo[]>(new Map());
const fetchExecutedOrders = async (
  config: RealFiNetworkConfig,
  addressBech32: string,
): Promise<IOrderInfo[]> =>
  executedOrdersMemo(`${config.realfiNetwork}:${addressBech32}`, async () =>
    realfiApi(config).getOrdersByOwner(addressBech32, ['Executed']),
  );
const tipMemo = memoized<number | undefined>(new Map());
const fetchTipSlotShared = async (
  blockfrost: RealFiBlockfrostConfig,
): Promise<number | undefined> =>
  tipMemo(blockfrost.baseUrl, async () => fetchChainTipSlot(blockfrost));

/**
 * UTxO references of the owner's still-cancelable RealFi orders — the pending,
 * funds-locked orders that can be reclaimed at the RealFi (stake) leg of the
 * flow. Uses the partner SDK's `getOrdersByOwner` (bech32-keyed) instead of a
 * hand-rolled GraphQL query.
 */
export const fetchCancelableRealFiOrderReferences = async (
  config: RealFiNetworkConfig,
  addressBech32: string,
): Promise<RealFiUtxoRef[]> => {
  const toReferences = (orders: IOrderInfo[]): RealFiUtxoRef[] =>
    orders.map(order => ({
      txHash: order.utxo.txHash,
      index: order.utxo.outputIndex,
    }));
  // Every pending, funds-locked state that has NOT executed is cancelable — not
  // just `Open`. `Open`/`Validating` are core statuses (all backends); a core
  // failure means we can't safely cancel, so return nothing.
  let references: RealFiUtxoRef[];
  try {
    references = toReferences(
      await realfiApi(config).getOrdersByOwner(addressBech32, [
        'Open',
        'Validating',
      ]),
    );
  } catch (error) {
    realfiDebugLog('getOrdersByOwner (cancelable) failed', { error });
    return [];
  }
  // `HeldForScreening` (source-of-funds screening, SDK 2.18) and `Rejected`
  // (never processed automatically, SDK 3.2) are also cancelable, but an older
  // deployment rejects newer enum values — query them separately and tolerate
  // the failure, mirroring the history read's CORE/SCREENING split.
  try {
    references = references.concat(
      toReferences(
        await realfiApi(config).getOrdersByOwner(addressBech32, [
          'HeldForScreening',
          'Rejected',
        ]),
      ),
    );
  } catch (error) {
    realfiDebugLog('screening-status cancel lookup skipped', { error });
  }
  const seen = new Set<string>();
  return references.filter(reference => {
    const key = `${reference.txHash}#${reference.index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * The address + USDr value of a timelock UTxO (read from its producing tx).
 * The USDr the timelock holds is what the claim tx pays — the vault fixed it
 * at execution — so it, not the order's sUSDr deposit, is the display amount.
 */
const timelockOutputAt = async (
  blockfrost: RealFiBlockfrostConfig,
  usdrTokenId: string,
  { txHash, index }: RealFiUtxoRef,
): Promise<{ address: string; usdrAmount: string } | undefined> => {
  const response = await fetch(
    `${blockfrostRestBase(blockfrost)}/txs/${txHash}/utxos`,
    { headers: blockfrostRestHeaders(blockfrost) },
  );
  if (!response.ok)
    throw new Error(`Blockfrost /txs/${txHash}: ${response.status}`);
  const body = (await response.json()) as {
    outputs: {
      output_index: number;
      address: string;
      amount: { unit: string; quantity: string }[];
    }[];
  };
  const output = body.outputs.find(o => o.output_index === index);
  if (!output) return undefined;
  const usdr = output.amount
    .filter(a => a.unit.toLowerCase() === usdrTokenId.toLowerCase())
    .reduce((sum, a) => sum + BigInt(a.quantity), 0n);
  return { address: output.address, usdrAmount: usdr.toString() };
};

/** Blockfrost's max UTxO page size. */
const BLOCKFROST_UTXO_PAGE = 100;
/**
 * Safety cap on the paged UTxO walk: 20 × 100 = 2000 unspent outputs at one
 * timelock script address is already far beyond realistic, and bounds a
 * runaway if a page never shrinks.
 */
const MAX_UTXO_PAGES = 20;

/**
 * The set of currently-unspent `txHash#index` at an address (empty on 404).
 *
 * Pages through Blockfrost until a short/empty page: reading only the first
 * 100 (oldest-first) would let an unspent output past page 1 read as spent,
 * and `filterUnspent` would then drop that unstake silently, leaving it
 * unclaimable through Lace.
 */
const unspentKeysAt = async (
  blockfrost: RealFiBlockfrostConfig,
  address: string,
): Promise<Set<string>> => {
  const keys = new Set<string>();
  for (let page = 1; page <= MAX_UTXO_PAGES; page += 1) {
    const response = await fetch(
      `${blockfrostRestBase(blockfrost)}/addresses/${address}/utxos` +
        `?count=${BLOCKFROST_UTXO_PAGE}&page=${page}`,
      { headers: blockfrostRestHeaders(blockfrost) },
    );
    // 404 = the address has no unspent UTxOs (everything at it was claimed).
    if (response.status === 404) break;
    if (!response.ok)
      throw new Error(`Blockfrost /addresses: ${response.status}`);
    const utxos = (await response.json()) as {
      tx_hash: string;
      output_index: number;
    }[];
    for (const utxo of utxos) keys.add(`${utxo.tx_hash}#${utxo.output_index}`);
    if (utxos.length < BLOCKFROST_UTXO_PAGE) break;
  }
  return keys;
};

/**
 * Drop candidates whose timelock UTxO has already been spent (claimed). A claim
 * spends the timelock output but leaves the RealFi order `Executed`, so the API
 * alone can't tell claimed from claimable — we check the live UTxO set. On a
 * transient Blockfrost error a candidate is kept (don't hide a real claimable);
 * the claimed case (404 / absent) is handled explicitly. The same UTxO read
 * also yields the timelock's actual USDr, replacing the candidate's sUSDr
 * fallback so displays match what the claim will pay.
 */
const filterUnspent = async (
  blockfrost: RealFiBlockfrostConfig,
  usdrTokenId: string,
  candidates: RealFiWithdrawableUnstake[],
): Promise<RealFiWithdrawableUnstake[]> => {
  const unspentByAddress = new Map<string, Set<string>>();
  const kept = await Promise.all(
    candidates.map(async candidate => {
      const { txHash, index } = candidate.timelockUtxo;
      try {
        const output = await timelockOutputAt(
          blockfrost,
          usdrTokenId,
          candidate.timelockUtxo,
        );
        if (!output) return undefined;
        let keys = unspentByAddress.get(output.address);
        if (!keys) {
          keys = await unspentKeysAt(blockfrost, output.address);
          unspentByAddress.set(output.address, keys);
        }
        if (!keys.has(`${txHash}#${index}`)) return undefined;
        // A timelock with zero USDr would be malformed — keep the fallback.
        return BigInt(output.usdrAmount) > 0n
          ? { ...candidate, usdrAmount: output.usdrAmount }
          : candidate;
      } catch (error) {
        realfiDebugLog('unspent check failed (kept)', { txHash, error });
        return candidate;
      }
    }),
  );
  return kept.filter((c): c is RealFiWithdrawableUnstake => c !== undefined);
};

/**
 * Executed unstakes whose cooldown timelock has opened (unlockSlot reached), so
 * their released USDr is ready to withdraw/claim. Slot→time uses the network's
 * Shelley start (exact on preview; approximate on preprod's Byron era). Throws
 * if the RealFi order read fails — the provider maps the throw to `Err` so the
 * store keeps its previous data instead of ingesting a false empty (which
 * would hide the claim banner on a transient outage).
 */
export const fetchWithdrawableUnstakes = async (
  config: RealFiNetworkConfig,
  addressBech32: string,
  blockfrost?: RealFiBlockfrostConfig,
): Promise<RealFiWithdrawableUnstake[]> => {
  const [orders, tipSlot] = await Promise.all([
    fetchExecutedOrders(config, addressBech32),
    blockfrost ? fetchTipSlotShared(blockfrost) : undefined,
  ]);
  const nowMs = Date.now();
  const candidates = orders.flatMap(order => {
    if (
      order.action.toLowerCase() !== 'unstake' ||
      order.unlockSlot === undefined ||
      !order.resultUtxo
    ) {
      return [];
    }
    // Still in cooldown → not yet withdrawable. Slot-vs-tip is exact;
    // the wall-clock fallback misclassifies across preprod's Byron era.
    const isStillLocked =
      tipSlot === undefined
        ? slotToMs(config.systemStartSeconds, Number(order.unlockSlot)) > nowMs
        : Number(order.unlockSlot) > tipSlot;
    if (isStillLocked) {
      return [];
    }
    return [
      {
        timelockUtxo: {
          txHash: order.resultUtxo.txHash,
          index: order.resultUtxo.outputIndex,
        },
        unlockSlot: Number(order.unlockSlot),
        // sUSDr-deposit fallback; filterUnspent replaces it with the
        // timelock's actual USDr when the UTxO read succeeds.
        usdrAmount: String(order.amount),
      },
    ];
  });
  // Exclude already-claimed timelocks (their UTxO is spent). Needs Blockfrost;
  // without a client config we can't verify, so fall back to the unchecked list.
  if (candidates.length === 0 || !blockfrost) return candidates;
  return await filterUnspent(blockfrost, config.usdrTokenId, candidates);
};

/**
 * Executed unstakes still in cooldown — their timelock unlock slot is in the
 * future, so the released USDr isn't withdrawable yet. Slot→time uses the
 * network's Shelley start (approximate on preprod's Byron era). No spent-check
 * needed (cooling-down funds can't have been claimed). Throws on read failure
 * so the provider surfaces `Err` and the store keeps its previous data.
 */
export const fetchCoolingDownUnstakes = async (
  config: RealFiNetworkConfig,
  addressBech32: string,
  blockfrost?: RealFiBlockfrostConfig,
): Promise<RealFiCoolingDownUnstake[]> => {
  const [orders, tipSlot] = await Promise.all([
    fetchExecutedOrders(config, addressBech32),
    blockfrost ? fetchTipSlotShared(blockfrost) : undefined,
  ]);
  const nowMs = Date.now();
  const entries = orders.flatMap(order => {
    if (
      order.action.toLowerCase() !== 'unstake' ||
      order.unlockSlot === undefined
    ) {
      return [];
    }
    const unlockSlot = Number(order.unlockSlot);
    const claimableAtMs = slotToWallClockMs(config, unlockSlot, {
      tipSlot,
      nowMs,
    });
    // Timelock already open → withdrawable, not cooling down. Slot-vs-tip
    // is exact; the wall-clock fallback misclassifies across preprod's
    // Byron era.
    const hasOpened =
      tipSlot === undefined ? claimableAtMs <= nowMs : unlockSlot <= tipSlot;
    if (hasOpened) {
      return [];
    }
    return [
      {
        unlockSlot,
        claimableAtMs,
        // sUSDr-deposit fallback, replaced below with the timelock's
        // actual USDr when its UTxO is readable.
        usdrAmount: String(order.amount),
        resultUtxo: order.resultUtxo,
      },
    ];
  });
  // The timelock's USDr was fixed at execution — read it so the cooldown
  // banner shows what the claim will eventually pay, not the sUSDr deposit.
  return await Promise.all(
    entries.map(async ({ resultUtxo, ...entry }) => {
      if (!blockfrost || !resultUtxo) return entry;
      try {
        const output = await timelockOutputAt(blockfrost, config.usdrTokenId, {
          txHash: resultUtxo.txHash,
          index: resultUtxo.outputIndex,
        });
        return output && BigInt(output.usdrAmount) > 0n
          ? { ...entry, usdrAmount: output.usdrAmount }
          : entry;
      } catch (error) {
        realfiDebugLog('cooldown value read failed', { error });
        return entry;
      }
    }),
  );
};

/** True when a stake order's USDr amount is a swap's received USDr less the batcher haircut. */
const amountsMatch = (orderAmount: number, swapReceived: number): boolean =>
  orderAmount <= swapReceived * 1.005 &&
  orderAmount >= swapReceived * (1 - STAKE_SWAP_MAX_HAIRCUT);

/** A RealFi order reduced to what the history needs (pre-display). */
type RawRealFiOrder = {
  /** Lower-cased action, e.g. 'stake' | 'unstake'. */
  action: string;
  /** Original-case action label for display. */
  label: string;
  amountBaseUnits: number;
  amountStr: string;
  /** True once the order has settled on-chain (status Executed). */
  isDone: boolean;
  /**
   * Set when the order reached a terminal state WITHOUT executing:
   * `canceled` (owner reclaimed it) or `failed` (`Invalidated`,
   * `InvalidMinReceived` — a floor no batch can clear, owner-cancellable —
   * `Rejected`, or `Failed`).
   * Unset ⇒ executed or still in flight.
   */
  terminal?: 'canceled' | 'failed';
  id: string;
  requestDate: number;
  /** Slot the order was created — orders the swap↔stake correlation. */
  slot: number;
  /** Unstake orders: wall-clock (ms) the cooldown timelock opens. */
  claimableAt?: number;
};

const terminalStateOf = (
  status: IOrderInfo['status'],
): RawRealFiOrder['terminal'] => {
  if (status === 'Canceled') return 'canceled';
  if (
    status === 'Invalidated' ||
    status === 'InvalidMinReceived' ||
    // SDK 2.18: invalidated by source-of-funds screening — terminal without
    // executing, like the other invalidations (HeldForScreening, its
    // in-flight sibling, correctly stays non-terminal).
    status === 'InvalidatedBlockedScreening' ||
    // SDK 3.1/3.2: never processed automatically (still owner-cancellable),
    // or quarantined after repeated processing failures.
    status === 'Rejected' ||
    status === 'Failed'
  ) {
    return 'failed';
  }
  return undefined;
};

/**
 * Order statuses split by schema generation. CORE statuses exist on every
 * RealFi deployment; the SCREENING pair was added with SDK/API 2.18, and an
 * older deployment (preprod today) rejects them as invalid `OrderStatus` enum
 * values. The SDK's `getOrdersByOwner` fires one request per status inside a
 * single Promise.all and throws if ANY fails — so its 2.18 DEFAULT status
 * list poisons EVERY history read against an older schema (the whole list
 * rendered empty on preprod while the API held the full history). Query the
 * generations separately: core failures still throw (→ provider `Err` → the
 * store keeps previous data), later-generation failures are tolerated.
 */
const CORE_ORDER_STATUSES: TOrderStatus[] = [
  'Open',
  'Validating',
  'Canceled',
  'Executed',
  'Invalidated',
  'InvalidMinReceived',
];
const SCREENING_ORDER_STATUSES: TOrderStatus[] = [
  'HeldForScreening',
  'InvalidatedBlockedScreening',
  // SDK 3.1 / 3.2 statuses.
  'Failed',
  'Rejected',
];

const fetchRealFiOrders = async (
  config: RealFiNetworkConfig,
  addressBech32: string,
  tipSlot: number | undefined,
): Promise<RawRealFiOrder[]> => {
  // Every lifecycle state, so settled AND dead orders stay in history instead
  // of being re-served as in-progress. A CORE read failure throws (→ provider
  // `Err` → store keeps previous data) — swallowing it into `[]` would wipe
  // the history list on a transient outage.
  const [coreOrders, screeningOrders] = await Promise.all([
    realfiApi(config).getOrdersByOwner(addressBech32, CORE_ORDER_STATUSES),
    realfiApi(config)
      .getOrdersByOwner(addressBech32, SCREENING_ORDER_STATUSES)
      .catch((error: unknown) => {
        // Older deployment without the 2.18 screening enum values — the core
        // history must not be lost over statuses the schema can't know.
        realfiDebugLog('screening-status read skipped', { error });
        return [] as IOrderInfo[];
      }),
  ]);
  // Dedupe by order UTxO across the two calls (mirroring the SDK's own
  // dedupe) and re-sort newest-first to match its ordering.
  const seen = new Set<string>();
  const orders = [...coreOrders, ...screeningOrders]
    .filter(order => {
      const key = `${order.utxo.txHash}#${order.utxo.outputIndex}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(b.slot - a.slot));
  const nowMs = Date.now();
  return orders.map(order => ({
    action: order.action.toLowerCase(),
    label: order.action,
    amountBaseUnits: Number(order.amount),
    amountStr: String(order.amount),
    isDone: order.status === 'Executed',
    terminal: terminalStateOf(order.status),
    id: order.utxo.txHash,
    slot: Number(order.slot),
    requestDate: slotToWallClockMs(config, Number(order.slot), {
      tipSlot,
      nowMs,
    }),
    ...(order.action.toLowerCase() === 'unstake' &&
      order.unlockSlot !== undefined && {
        claimableAt: slotToWallClockMs(config, Number(order.unlockSlot), {
          tipSlot,
          nowMs,
        }),
      }),
  }));
};

/** Map a directly-signed RealFi order (not the downstream leg of a swap) to a row. */
const mapDirectOrder = (raw: RawRealFiOrder): RealFiStakeActivity => {
  const subtitle = (ticker: string): string =>
    `-${formatAmountToLocale(raw.amountStr, DEFAULT_DECIMALS)} ${ticker}`;
  if (raw.action === 'stake') {
    return {
      id: raw.id,
      kind: 'stake',
      label: raw.label,
      subtitle: subtitle('USDrf'),
      completed: raw.isDone,
      requestDate: raw.requestDate,
      steps: [
        {
          key: 'stake',
          status: raw.isDone ? 'completed' : raw.terminal ?? 'active',
        },
        {
          key: 'received',
          status: raw.isDone ? 'completed' : raw.terminal ?? 'pending',
        },
      ],
    };
  }
  const isUnstake = raw.action === 'unstake';
  return {
    id: raw.id,
    kind: isUnstake ? 'unstake' : 'other',
    label: raw.label,
    subtitle: subtitle(isUnstake ? 'sUSDrf' : 'USDrf'),
    completed: raw.isDone,
    requestDate: raw.requestDate,
    ...(isUnstake &&
      raw.claimableAt !== undefined && { claimableAt: raw.claimableAt }),
    // An unstake completes when its cooldown ENDS (LW-14653) — an executed
    // order mid-cooldown has no completion date yet.
    ...(isUnstake &&
      raw.isDone &&
      raw.claimableAt !== undefined &&
      raw.claimableAt <= Date.now() && { completedAt: raw.claimableAt }),
    steps: [
      {
        key: isUnstake ? 'unstake' : 'stake',
        status: raw.isDone ? 'completed' : raw.terminal ?? 'active',
      },
    ],
  };
};

// --- SundaeSwap swap orders (input → USDR) ---

const SUNDAE_ORDERS_QUERY = `
  query getSwapOrders($address: String!, $cursor: String!) {
    portfolio(address: $address) {
      ordersPaginated(limit: ${PAGE_LIMIT}, cursor: $cursor) {
        cursor
        orders {
          id
          createdAt { slot }
          outcome
          assets { asset { id ticker decimals } }
          details {
            __typename
            ... on Swap {
              offer { quantity asset { id } }
              received { quantity asset { id } }
              estimated { quantity asset { id } }
              minimum { quantity asset { id } }
            }
          }
        }
      }
    }
  }
`;

// Safety cap so a runaway/looping cursor can't page forever. 10 × 100 = 1000
// orders covers any realistic staking wallet; the oldest beyond it are lost
// (rare, and only affects history depth, never correctness).
const MAX_SWAP_PAGES = 10;

type SundaeAssetRef = { id: string };
type SundaeAmount = { quantity: string; asset: SundaeAssetRef };
type SundaeOrder = {
  id: string;
  createdAt: { slot: number };
  outcome: string | null;
  assets: { asset: { id: string; ticker: string; decimals: number } }[];
  details: {
    __typename: string;
    offer?: SundaeAmount;
    received?: SundaeAmount | null;
    /** Expected output — populated even while `received` is still null. */
    estimated?: SundaeAmount | null;
    /** Guaranteed floor — the one output figure a pool-less V4 intent carries. */
    minimum?: SundaeAmount | null;
  };
};

type SwapWithReceived = {
  entry: RealFiStakeActivity;
  /** USDr the swap yielded (base units); undefined if it didn't produce USDr. */
  usdrReceived?: number;
  /** Slot the swap order was created — orders the swap↔stake correlation. */
  slot: number;
};

const fetchSundaeSwaps = async (
  config: RealFiNetworkConfig,
  addressBech32: string,
  tipSlot: number | undefined,
): Promise<SwapWithReceived[]> => {
  const nowMs = Date.now();
  const usdrId = sundaeUsdrId(config);
  const tickers = knownTickers(config);

  // Follow the page cursor so a wallet with more than one page of orders sees
  // its full history, not just the newest PAGE_LIMIT. An empty/absent cursor,
  // an empty page, or an unchanged cursor ends the walk (defensive against a
  // backend that echoes the cursor). A null portfolio is a valid "address
  // unknown to Sundae" answer — only transport/GraphQL failures throw (in
  // `graphql`) to keep previous data.
  const orders: SundaeOrder[] = [];
  let cursor = '';
  for (let page = 0; page < MAX_SWAP_PAGES; page += 1) {
    const data = await graphql<{
      portfolio: {
        ordersPaginated: { cursor: string | null; orders: SundaeOrder[] };
      } | null;
    }>(config.sundaeApiUrl, {
      query: SUNDAE_ORDERS_QUERY,
      variables: { address: addressBech32, cursor },
      operationName: 'getSwapOrders',
    });
    const paginated = data.portfolio?.ordersPaginated;
    if (!paginated) break;
    orders.push(...paginated.orders);
    const nextCursor = paginated.cursor ?? '';
    if (
      paginated.orders.length < PAGE_LIMIT ||
      nextCursor === '' ||
      nextCursor === cursor
    ) {
      break;
    }
    cursor = nextCursor;
  }
  return orders.flatMap(order => {
    if (order.details.__typename !== 'Swap' || !order.details.offer) return [];
    const decimalsById = new Map<string, number>(
      order.assets.map(({ asset }) => [asset.id, asset.decimals]),
    );
    const tickerOf = (id: string): string =>
      tickers[id] ??
      order.assets.find(({ asset }) => asset.id === id)?.asset.ticker ??
      id.slice(0, 6);
    const decimalsOf = (id: string): number =>
      decimalsById.get(id) ?? DEFAULT_DECIMALS;

    const { offer, received, estimated, minimum } = order.details;
    // Staking history covers only the input→USDr swap legs. The receive asset
    // is `received` once settled, else the SDK's `estimated` output (populated
    // while the order is still pending) — an explicit per-order signal, not a
    // guess. A swap counts only when that receive asset is USDr; anything else
    // at the address is unrelated trading. (Replaces the old blind `?? usdrId`
    // default and the `order.assets`-membership heuristic, which mislabelled
    // pending swaps when Sundae populated `assets` from the offered side only.)
    const receivedId =
      received?.asset.id ?? estimated?.asset.id ?? minimum?.asset.id;
    if (receivedId !== usdrId) return [];
    const usdrReceived = received ? Number(received.quantity) : undefined;
    // What the swap was quoted to return; a V4 intent carries only its floor.
    const quoted = [estimated, minimum].find(
      amount => amount?.asset.id === usdrId,
    );
    const offerLine = `-${formatAmountToLocale(
      offer.quantity,
      decimalsOf(offer.asset.id),
    )} ${tickerOf(offer.asset.id)}`;
    // The received line exists only once the swap settles: before that nothing
    // has landed, and a "+0 USDr" would read as a zero-value fill.
    const receivedLine = received
      ? `+${formatAmountToLocale(
          received.quantity,
          decimalsOf(receivedId),
        )} ${tickerOf(receivedId)}`
      : undefined;
    // One row per user-signed swap→stake. Baseline progress: swap (SundaeSwap
    // scooper) → stake (RealFi batcher) → received (sUSDr). getStakeActivities
    // then advances the stake/received steps from the matched RealFi order.
    const isSwapDone = order.outcome === 'Executed';
    const entry: RealFiStakeActivity = {
      id: order.id,
      kind: 'swap',
      label: `${tickerOf(offer.asset.id)} → ${tickerOf(receivedId)}`,
      subtitle: receivedLine ? `${receivedLine}, ${offerLine}` : offerLine,
      // Detail sheet only: the staked USDr and the input line shown on separate
      // rows. `stakedUsdrBaseUnits` starts as the swap's received USDr (the
      // pending estimate) and is overwritten with the matched stake order's
      // amount — the actual staked figure — once merged below.
      ...(received ? { stakedUsdrBaseUnits: received.quantity } : {}),
      ...(quoted ? { quotedUsdrBaseUnits: quoted.quantity } : {}),
      swapInputLine: offerLine,
      completed: isSwapDone,
      requestDate: slotToWallClockMs(config, order.createdAt.slot, {
        tipSlot,
        nowMs,
      }),
      steps: [
        { key: 'swap', status: isSwapDone ? 'completed' : 'active' },
        { key: 'stake', status: isSwapDone ? 'active' : 'pending' },
        { key: 'received', status: 'pending' },
      ],
    };
    return [{ entry, usdrReceived, slot: order.createdAt.slot }];
  });
};

/**
 * The merged, newest-first staking history for an account (RealFi orders +
 * SundaeSwap swaps). Called by the `RealFiProvider` in the service worker; the
 * result is stored in redux and read by the UI via a selector.
 */
export const getStakeActivities = async (
  params: GetStakeActivitiesParams,
): Promise<RealFiStakeActivity[]> => {
  const tipSlot = params.blockfrost
    ? await fetchTipSlotShared(params.blockfrost)
    : undefined;
  const [swaps, orders] = await Promise.all([
    fetchSundaeSwaps(params.config, params.addressBech32, tipSlot),
    fetchRealFiOrders(params.config, params.addressBech32, tipSlot),
  ]);

  // Correlate each executed swap with its downstream RealFi stake order (the
  // batcher leg, matched by USDr amount AND slot order: the batcher creates the
  // stake order after the swap settles, so an earlier order can never be its
  // leg — amount alone would happily pair same-sized orders across time). The
  // earliest qualifying order wins. A matched order is consumed → it isn't
  // also shown as its own row.
  const consumed = new Set<number>();
  const swapEntries = swaps.map(({ entry, usdrReceived, slot }) => {
    const isSwapDone =
      entry.steps.find(step => step.key === 'swap')?.status === 'completed';
    if (!isSwapDone || usdrReceived === undefined) return entry;
    let orderIndex = -1;
    for (const [index, order] of orders.entries()) {
      if (
        consumed.has(index) ||
        order.action !== 'stake' ||
        order.slot < slot ||
        !amountsMatch(order.amountBaseUnits, usdrReceived)
      ) {
        continue;
      }
      if (orderIndex < 0 || order.slot < orders[orderIndex].slot) {
        orderIndex = index;
      }
    }
    if (orderIndex < 0) return entry; // batcher hasn't created the stake order yet
    consumed.add(orderIndex);
    const { isDone: isStaked, terminal, amountStr } = orders[orderIndex];
    return {
      ...entry,
      // The actual USDr staked (swap output minus the batcher haircut), for the
      // detail sheet's Stake amount — the swap's received USDr was only the
      // pending estimate.
      stakedUsdrBaseUnits: amountStr,
      completed: isStaked,
      steps: [
        { key: 'swap', status: 'completed' },
        { key: 'stake', status: isStaked ? 'completed' : terminal ?? 'active' },
        {
          key: 'received',
          status: isStaked ? 'completed' : terminal ?? 'pending',
        },
      ] as RealFiActivityStep[],
    };
  });
  const orderEntries = orders
    .filter((_, index) => !consumed.has(index))
    .map(mapDirectOrder);

  return [...swapEntries, ...orderEntries].sort(
    (a, b) => b.requestDate - a.requestDate,
  );
};
