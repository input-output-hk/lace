/**
 * Per-network RealFi config, delivered via the `REALFI` feature flag payload so
 * the values (endpoints, policy ids, swap counterpart assets, Blockfrost
 * network, Shelley system-start) can rotate from the CMS without a release.
 * Mirrors the Midnight per-network URL payload pattern. Bootstrap refs are no
 * longer carried here — the partner SDK's `NETWORK_REGISTRY` supplies them to
 * `detectParams` by network name.
 *
 * The payload is a `Partial<Record<RealFiSdkNetwork, RealFiNetworkConfig>>`; a
 * network with no entry resolves to `undefined` ⇒ the feature is unavailable on
 * that network (no fetch, no cross-network leakage — ADR 11). `PREVIEW_REALFI_CONFIG`
 * is the reference preview value, used to seed the app's default flag payload and
 * as the module's compile-time fallback for redux-less contexts.
 */
import { CardanoNetworkId } from '@lace-contract/cardano-context';

import { FEATURE_FLAG_REALFI } from './const';

import type { FeatureFlag } from '@lace-contract/feature';
import type { BlockchainNetworkId } from '@lace-contract/network';

/** RealFi SDK / SundaeSwap network name (both share this union). */
export type RealFiSdkNetwork = 'mainnet' | 'preprod' | 'preview';

/** Cardano network magics RealFi may run on. */
export const CARDANO_NETWORK_MAGIC = {
  mainnet: 764_824_073,
  preprod: 1,
  preview: 2,
} as const satisfies Record<RealFiSdkNetwork, number>;

/**
 * A CMS-scheduled activation window. Active while
 * `activeFrom <= now <= activeTo`.
 *
 * Both bounds are optional in the type because the payload is untrusted, but
 * both are required for the window to open: a missing, non-string or
 * unparseable instant fails closed, so a malformed CMS entry hides the surface
 * rather than running an unscheduled or expired promotion.
 */
export type RealFiActiveWindow = {
  /** UTC instant (ISO-8601) from which the surface is live. */
  activeFrom?: string;
  /** UTC instant (ISO-8601) after which the surface stops rendering. */
  activeTo?: string;
};

/**
 * Genesis Boost promotion (LW-15495 AC1) — a bonus-rate window that runs
 * independently of the launch season: this governs the Staking Center banner
 * and supplies the end date its copy shows, while the R-Points surfaces are
 * governed by {@link RealFiLaunchSeasonConfig}. The two can start and end on
 * different days, so neither may be derived from the other.
 */
export type RealFiGenesisBoostConfig = RealFiActiveWindow;

/**
 * RealFi launch-season surfaces (LW-15495): the R-Points card, its explainer
 * sheet and the acquisition-bonus messaging. The window governs whether those
 * surfaces render at all; the URLs are optional per field so RealFi can turn
 * each deep link on/off from the CMS without a release.
 */
export type RealFiLaunchSeasonConfig = RealFiActiveWindow & {
  /**
   * RealFi rewards dashboard URL — the R-Points card's ↗ deep link, opened via
   * Lace's standard external-link handling. Absent ⇒ the affordance is hidden.
   */
  rewardsDashboardUrl?: string;
  /**
   * RealFi points program page URL — the explainer sheet's "More details" deep
   * link. Absent ⇒ that button is hidden ("Got it" alone remains).
   */
  pointsProgramUrl?: string;
};

/** Everything RealFi needs that differs per Cardano network (JSON-serializable). */
export type RealFiNetworkConfig = {
  networkMagic: number;
  /** RealFi SDK network name. */
  realfiNetwork: RealFiSdkNetwork;
  /** SundaeSwap network name. */
  sundaeNetwork: RealFiSdkNetwork;
  /** Blaze/Blockfrost network id, e.g. `cardano-preview`. */
  blockfrostNetwork: `cardano-${RealFiSdkNetwork}`;
  /** True → `Core.NetworkId.Mainnet`; false → `Testnet`. */
  isMainnet: boolean;
  /** RealFi backend GraphQL endpoint. */
  realfiApiUrl: string;
  /** SundaeSwap GraphQL endpoint. */
  sundaeApiUrl: string;
  /** USDr/sUSDr minting policy id (both share one policy, differing by asset name). */
  usdrPolicyId: string;
  /** Wallet token id (concatenated `policyId + assetNameHex`) of USDr. */
  usdrTokenId: string;
  /** Wallet token id (concatenated) of sUSDr — the staked receipt token. */
  susdrTokenId: string;
  /**
   * Assets offered as swap→stake inputs (and unstake swap-back outputs), in
   * SundaeSwap `policyId.assetNameHex` counterpart form (ADA = "ada.lovelace").
   * Compile-time FALLBACK only: the live product-curated list is read at
   * runtime from `partnerConfigUrl` (the same `partner-config.json` the SDK's
   * `getPartnerConfig()` reads); this copy serves while that read is
   * unavailable. Mirrors `swapCounterpartAssets` in RealFi's per-network app
   * config (realfi-co/realfi frontend/app/config/<network>.json).
   */
  swapCounterpartAssets: string[];
  /**
   * RealFi's runtime partner configuration (`partner-config.json`): the
   * authoritative USDr asset id and product-curated swap list shared with the
   * deployed RealFi dapp. Mirrors the partner SDK's `API_REGISTRY`
   * `partnerConfigUrl` per network.
   */
  partnerConfigUrl: string;
  /**
   * Shelley-adjusted slot-zero reference (unix seconds): a Shelley+ slot
   * converts to wall-clock as `(systemStartSeconds + slot) * 1000`. On
   * networks with a Byron era (preprod, mainnet) this is NOT the genesis
   * system start — it carries the Byron 20s-slot correction so the formula
   * stays exact for every Shelley+ slot (Byron slots, which carry no RealFi
   * activity, would be wrong).
   */
  systemStartSeconds: number;
  /**
   * SundaeSwap V3 max scooper fee (lovelace) funded on each swap leg. A
   * protocol constant read from the settings datum by SundaeSwap's own SDK;
   * carried here (CMS-overridable) so builds don't need a Blaze-hosted
   * on-chain read. Overpaying is accepted; underpaying makes scoopers skip
   * the order — bump via the REALFI flag payload if SundaeSwap raises it.
   *
   * Preview value captured live (2026-08-03) via a Blaze-free route: GraphQL
   * `QueryProviderSundaeSwap.getProtocolParamsWithScripts('V3')` for the
   * `settings.mint` validator hash, Blockfrost REST for the settings NFT's
   * UTxO + inline datum, then `@blaze-cardano/data`'s pure `parse` against
   * `@sundaeswap/core`'s `SettingsDatum` contract type (both pure — sidesteps
   * the `@sundaeswap/math` export defect below) → `baseFee` (432000) +
   * `simpleFee` (168000) = 600000. The SDK's own `getMaxScooperFeeAmount()` is
   * Blaze-only (needs a live `blazeInstance`) and falls back to a hardcoded
   * `1_000_000n` (1 ADA) on any settings-read failure — so the previous
   * "placeholder (1 ADA)" here was actually that SDK fallback constant, not
   * an independently-verified value. Preprod has no bundled Blockfrost
   * credential to repeat this capture, so it carries the preview value
   * pending its own live capture (overpaying is safe either way).
   */
  maxScooperFeeLovelace: number;
  /**
   * Genesis Boost banner window. PostHog-only — deliberately absent from every
   * bundled default below, so the promotion can never run (or linger) on a
   * build's compile-time config. Shape in the REALFI payload:
   *
   * ```json
   * "preprod": {
   *   "genesisBoost": {
   *     "activeFrom": "2026-09-13T00:00:00Z",
   *     "activeTo": "2026-09-27T23:59:59Z"
   *   }
   * }
   * ```
   */
  genesisBoost?: RealFiGenesisBoostConfig;
  /**
   * Launch-season (R-Points) surfaces. Also PostHog-only, and deliberately
   * outside the structural guard: the season is temporary and CMS-controlled,
   * so a missing or malformed entry must never disable core staking. Shape in
   * the REALFI payload:
   *
   * ```json
   * "preprod": {
   *   "launchSeason": {
   *     "activeFrom": "2026-09-13T00:00:00Z",
   *     "activeTo": "2026-12-31T23:59:59Z",
   *     "rewardsDashboardUrl": "https://app.realfi.co/rewards",
   *     "pointsProgramUrl": "https://realfi.co/points"
   *   }
   * }
   * ```
   */
  launchSeason?: RealFiLaunchSeasonConfig;
};

/**
 * A per-network entry in the `REALFI` flag payload: overrides layered on top of
 * the compile-time defaults ({@link DEFAULT_CONFIG_BY_NETWORK}). Only the
 * properties present are overridden. An empty object (`{}`) enables the network
 * on its bundled defaults.
 */
export type RealFiNetworkConfigOverride = Partial<RealFiNetworkConfig>;

/**
 * The `REALFI` feature-flag payload: per-network overrides keyed by network name.
 * The **presence** of an entry enables RealFi on that network — PostHog gates
 * *who* receives the flag (geographical region, device type) and *which*
 * networks it carries, so no region/device logic lives in-app.
 */
export type RealFiFeaturePayload = Partial<
  Record<RealFiSdkNetwork, RealFiNetworkConfigOverride>
>;

export type RealFiFeatureFlag = FeatureFlag<RealFiFeaturePayload>;

const USDR_ASSET_NAME_HEX = '55534472'; // "USDr"
const SUSDR_ASSET_NAME_HEX = '7355534472'; // "sUSDr"

const PREVIEW_USDR_POLICY_ID =
  '45df5f274b8950b512b08d10656864958659c4ecf3ffad092ef63024';

/**
 * Reference preview config (sourced from RealFi's `preview.json`). Seeds the
 * app's default `REALFI` flag payload and the module's redux-less fallback.
 */
export const PREVIEW_REALFI_CONFIG: RealFiNetworkConfig = {
  networkMagic: CARDANO_NETWORK_MAGIC.preview,
  realfiNetwork: 'preview',
  sundaeNetwork: 'preview',
  blockfrostNetwork: 'cardano-preview',
  isMainnet: false,
  realfiApiUrl: 'https://api.preview.realfi.co/graphql',
  sundaeApiUrl: 'https://api.preview.sundae.fi/graphql',
  partnerConfigUrl: 'https://preview.realfi.co/partner-config.json',
  usdrPolicyId: PREVIEW_USDR_POLICY_ID,
  usdrTokenId: `${PREVIEW_USDR_POLICY_ID}${USDR_ASSET_NAME_HEX}`,
  susdrTokenId: `${PREVIEW_USDR_POLICY_ID}${SUSDR_ASSET_NAME_HEX}`,
  // RealFi's preview.json list: USDM + USDCx (no ADA). Both pairs resolve to
  // Stableswaps pools, which the SDK's swap→stake composer builds since 2.12
  // (adopted 2026-08-24); the runtime partner-config list supersedes this
  // fallback when reachable.
  swapCounterpartAssets: [
    'd8906ca5c7ba124a0407a32dab37b2c82b13b3dcd9111e42940dcea4.0014df105553444d',
    'd8906ca5c7ba124a0407a32dab37b2c82b13b3dcd9111e42940dcea4.5553444378',
  ],
  systemStartSeconds: 1_666_656_000,
  // Live-captured value — see maxScooperFeeLovelace doc comment.
  maxScooperFeeLovelace: 600_000,
};

// Preprod USDr policy id — resolved from the SDK (`getUsdrAssetId()`) against
// the SDK's preprod bootstrap refs; USDr/sUSDr share this policy, differing by
// asset name. Endpoints mirror the RealFi preprod portal config.
const PREPROD_USDR_POLICY_ID =
  '0684f582b8abeb4236b20688744eca788a61cd9881422a7113637f6b';

const PREPROD_SWAP_ASSET_POLICY =
  'd8906ca5c7ba124a0407a32dab37b2c82b13b3dcd9111e42940dcea4';

/**
 * Preprod RealFi config. RealFi runs the V1_0 protocol on preprod (same as
 * preview). There is no ADA↔USDr SundaeSwap pool on preprod, so staking is from
 * USDr (direct, no swap), USDCx, or USDM only. The Blockfrost credential comes
 * from Lace's injected cardano-provider (network magic 1).
 */
export const PREPROD_REALFI_CONFIG: RealFiNetworkConfig = {
  networkMagic: CARDANO_NETWORK_MAGIC.preprod,
  realfiNetwork: 'preprod',
  sundaeNetwork: 'preprod',
  blockfrostNetwork: 'cardano-preprod',
  isMainnet: false,
  realfiApiUrl: 'https://api.preprod.realfi.co/graphql',
  sundaeApiUrl: 'https://api.preprod.sundae.fi/graphql',
  partnerConfigUrl: 'https://preprod.realfi.co/partner-config.json',
  usdrPolicyId: PREPROD_USDR_POLICY_ID,
  usdrTokenId: `${PREPROD_USDR_POLICY_ID}${USDR_ASSET_NAME_HEX}`,
  susdrTokenId: `${PREPROD_USDR_POLICY_ID}${SUSDR_ASSET_NAME_HEX}`,
  // RealFi's preprod.json list: USDCx + USDM (plain-name USDM on preprod, not
  // the CIP-68 asset preview uses).
  // Pools resolve dynamically per pair (V3 only). Note both preprod pairs
  // ALSO have deeper Stableswaps pools (e.g. 728fa14d… for USDCx) — the V3
  // filter keeps the resolver off them; their V3 pools quote thin/off-peg.
  swapCounterpartAssets: [
    `${PREPROD_SWAP_ASSET_POLICY}.5553444378`,
    `${PREPROD_SWAP_ASSET_POLICY}.5553444d`,
  ],
  // Shelley-era offset (Byron genesis 1_654_041_600 + 86_400 Byron slots ×
  // 19s correction = 1_641_600): exact for every Shelley+ slot under the
  // `(systemStartSeconds + slot) * 1000` formula (verified against live tip:
  // 1_655_683_200 + slot 132_071_129 = block time 1_787_754_329). The raw
  // genesis start here misclassified cooling-down unstakes as withdrawable
  // (19 days early).
  systemStartSeconds: 1_655_683_200,
  // Borrowed from the preview live capture (no bundled preprod Blockfrost
  // credential to repeat it) — see maxScooperFeeLovelace doc comment.
  maxScooperFeeLovelace: 600_000,
};

// Mainnet USDr policy id — resolved live (2026-08-04) via the SDK:
// `detectParams(provider, 'mainnet')` (V1_0 protocol detected) →
// `getUsdrAssetId()`. USDr/sUSDr share this policy, differing by asset name.
const MAINNET_USDR_POLICY_ID =
  '7d9e4a0ee1a3f5d5ff8159ea91a83310cf2795ee7a87170c7aea05ae';

/**
 * Mainnet RealFi config (values from RealFi's `mainnet.json` + live SDK
 * detection). Enablement still requires a `mainnet` entry in the REALFI flag
 * payload — bundling this default does not turn the feature on. The Blockfrost
 * credential comes from Lace's injected cardano-provider config.
 */
export const MAINNET_REALFI_CONFIG: RealFiNetworkConfig = {
  networkMagic: CARDANO_NETWORK_MAGIC.mainnet,
  realfiNetwork: 'mainnet',
  sundaeNetwork: 'mainnet',
  blockfrostNetwork: 'cardano-mainnet',
  isMainnet: true,
  realfiApiUrl: 'https://api.app.realfi.co/graphql',
  sundaeApiUrl: 'https://api.sundae.fi/graphql',
  partnerConfigUrl: 'https://app.realfi.co/partner-config.json',
  usdrPolicyId: MAINNET_USDR_POLICY_ID,
  usdrTokenId: `${MAINNET_USDR_POLICY_ID}${USDR_ASSET_NAME_HEX}`,
  susdrTokenId: `${MAINNET_USDR_POLICY_ID}${SUSDR_ASSET_NAME_HEX}`,
  // RealFi's mainnet.json list: USDCx only.
  swapCounterpartAssets: [
    '1f3aec8bfe7ea4fe14c5f121e2a92e301afe414147860d557cac7e34.5553444378',
  ],
  // No USDr pool exists on SundaeSwap mainnet yet (checked 2026-08-04 via the
  // Sundae GraphQL — USDCx pairs with SUNDAE/USDM/iUSD/ADA/…, none with USDr).
  // Pools resolve dynamically per pair, so the first V3 USDr pool is picked up
  // with no config change; until then swap→stake quotes fail with "No V3
  // SundaeSwap pool available" and only a direct USDr stake could build.
  // Shelley-era offset (slot 4,492,800 ↔ 2020-07-29T21:44:51Z): exact for
  // every Shelley+ slot under the `(systemStartSeconds + slot) * 1000`
  // formula; Byron-era slots (none carry RealFi activity) would be wrong.
  systemStartSeconds: 1_591_566_291,
  // Borrowed from the preview live capture pending a mainnet capture — see the
  // maxScooperFeeLovelace doc comment (overpaying is safe; underpaying stalls).
  maxScooperFeeLovelace: 600_000,
};

const NETWORK_NAME_BY_MAGIC: Record<number, RealFiSdkNetwork> = {
  [CARDANO_NETWORK_MAGIC.mainnet]: 'mainnet',
  [CARDANO_NETWORK_MAGIC.preprod]: 'preprod',
  [CARDANO_NETWORK_MAGIC.preview]: 'preview',
};

/** The RealFi network name for a Cardano `BlockchainNetworkId`, if recognised. */
export const realfiNetworkForNetworkId = (
  networkId: BlockchainNetworkId | undefined,
): RealFiSdkNetwork | undefined => {
  if (!networkId) return undefined;
  const chainId = CardanoNetworkId.getChainId(networkId);
  return chainId
    ? NETWORK_NAME_BY_MAGIC[Number(chainId.networkMagic)]
    : undefined;
};

/** Minimal structural guard for an untrusted (CMS) per-network config entry. */
const isRealFiNetworkConfig = (
  value: unknown,
): value is RealFiNetworkConfig => {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Partial<RealFiNetworkConfig>;
  return (
    typeof config.realfiApiUrl === 'string' &&
    typeof config.sundaeApiUrl === 'string' &&
    typeof config.usdrPolicyId === 'string' &&
    typeof config.usdrTokenId === 'string' &&
    typeof config.susdrTokenId === 'string' &&
    typeof config.blockfrostNetwork === 'string' &&
    typeof config.networkMagic === 'number' &&
    Array.isArray(config.swapCounterpartAssets) &&
    typeof config.partnerConfigUrl === 'string'
  );
};

/**
 * Compile-time fallback config per network — the baseline the flag payload
 * overrides. Presence of a default does NOT enable a network; the payload
 * entry does (see {@link getRealFiConfigFromFlags}).
 */
const DEFAULT_CONFIG_BY_NETWORK: Partial<
  Record<RealFiSdkNetwork, RealFiNetworkConfig>
> = {
  preview: PREVIEW_REALFI_CONFIG,
  preprod: PREPROD_REALFI_CONFIG,
  mainnet: MAINNET_REALFI_CONFIG,
};

/**
 * The compile-time default RealFi config for a network, ignoring feature flags.
 * For flag-less callers that only have a `networkId` and cannot resolve the
 * `REALFI` payload (e.g. the provider's exchange-rate helper). Feature
 * availability is still gated by {@link getRealFiConfigFromFlags} elsewhere.
 */
export const getDefaultRealFiConfig = (
  networkId: BlockchainNetworkId | undefined,
): RealFiNetworkConfig | undefined => {
  const network = realfiNetworkForNetworkId(networkId);
  return network ? DEFAULT_CONFIG_BY_NETWORK[network] : undefined;
};

const findRealFiFlag = (
  featureFlags: readonly FeatureFlag[],
): RealFiFeatureFlag | undefined =>
  featureFlags.find(({ key }) => key === FEATURE_FLAG_REALFI) as
    | RealFiFeatureFlag
    | undefined;

const resolveNetworkConfig = (
  flag: RealFiFeatureFlag | undefined,
  network: RealFiSdkNetwork,
): RealFiNetworkConfig | undefined => {
  const override = flag?.payload?.[network];
  // No entry for this network → feature off (presence = enabled).
  if (override === undefined) return undefined;
  const base = DEFAULT_CONFIG_BY_NETWORK[network];
  const merged = { ...base, ...override };
  return isRealFiNetworkConfig(merged) ? merged : undefined;
};

/**
 * Resolve the RealFi config for a Cardano network from the `REALFI` flag.
 *
 * A network is enabled **iff** the payload has an entry for it — the entry's
 * presence is the on-switch (PostHog decides who gets the flag and which
 * networks it carries). The entry's properties override the compile-time
 * defaults ({@link DEFAULT_CONFIG_BY_NETWORK}). Returns `undefined` (feature
 * off) when the network has no entry, the flag is absent, or the merged config
 * fails validation.
 *
 * EXTENSION CAVEAT: rotating `realfiApiUrl` / `sundaeApiUrl` /
 * `partnerConfigUrl` to a NEW origin via the payload works on mobile only.
 * The extension's MV3 CSP pins the allowed origins at build time
 * (`$REALFI_SERVICES_URLS` in `apps/lace-extension/webpack/webpack-utils.js`),
 * so a rotated origin is CSP-blocked (fails closed) until a release updates
 * that list.
 */
export const getRealFiConfigFromFlags = (
  featureFlags: readonly FeatureFlag[],
  networkId: BlockchainNetworkId | undefined,
): RealFiNetworkConfig | undefined => {
  const network = realfiNetworkForNetworkId(networkId);
  if (!network) return undefined;
  return resolveNetworkConfig(findRealFiFlag(featureFlags), network);
};

/**
 * Whether `nowMs` falls inside a CMS-scheduled window (inclusive of both
 * bounds). Fails closed on an absent window and on any bound that is missing,
 * not a string (untrusted CMS payload) or unparseable.
 */
const isWindowActive = (
  window: RealFiActiveWindow | undefined,
  nowMs: number,
): boolean => {
  const { activeFrom, activeTo } = window ?? {};
  if (typeof activeFrom !== 'string' || typeof activeTo !== 'string')
    return false;
  const fromMs = Date.parse(activeFrom);
  const toMs = Date.parse(activeTo);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return false;
  return nowMs >= fromMs && nowMs <= toMs;
};

/**
 * Whether the Genesis Boost banner should render at `nowMs` (LW-15495 AC1).
 * Independent of the launch season: the banner can run inside, across or
 * entirely outside the season's own window.
 */
export const isGenesisBoostActive = (
  genesisBoost: RealFiGenesisBoostConfig | undefined,
  nowMs: number,
): boolean => isWindowActive(genesisBoost, nowMs);

/**
 * Whether the launch-season surfaces — the R-Points card, its explainer sheet
 * and the acquisition-bonus messaging — should render at `nowMs` (LW-15495
 * AC2–AC4). Also gates the R-Points read itself, so an out-of-season wallet
 * makes no points request.
 */
export const isLaunchSeasonActive = (
  launchSeason: RealFiLaunchSeasonConfig | undefined,
  nowMs: number,
): boolean => isWindowActive(launchSeason, nowMs);

const ALL_REALFI_NETWORKS = Object.values(NETWORK_NAME_BY_MAGIC);

/**
 * Whether the `REALFI` flag payload defines at least one network that resolves
 * to a valid config — the module's `willLoad` gate. Unrecognized payload keys
 * and entries whose merged config fails validation do not count, so the USDr
 * staking centre only appears when some network could actually serve it.
 */
export const hasAnyRealFiNetwork = (
  featureFlags: readonly FeatureFlag[],
): boolean => {
  const flag = findRealFiFlag(featureFlags);
  return ALL_REALFI_NETWORKS.some(
    network => resolveNetworkConfig(flag, network) !== undefined,
  );
};
