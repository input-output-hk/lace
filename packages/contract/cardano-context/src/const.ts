import { Cardano } from '@cardano-sdk/core';
import { FeatureFlagKey } from '@lace-contract/feature';
import { TokenId } from '@lace-contract/tokens';
import { Timestamp } from '@lace-sdk/util';

import { CardanoNetworkId } from './value-objects';

import type { BlockchainNetworkId } from '@lace-contract/network';

export const FEATURE_FLAG_CARDANO = FeatureFlagKey('BLOCKCHAIN_CARDANO');

/**
 * Gates the security-exploit surfacing UI (per-exploit banner, account-name
 * marker, alert/redirect) for findings flagged on activities, e.g. the
 * SecondFi/Yoroi compromise. Detection runs at activity-mapping time; this flag
 * only controls the user-facing surface. Off by default; rolled out via the
 * PostHog CMS so it can be enabled and reconfigured without an app release.
 */
export const FEATURE_FLAG_WALLET_SECURITY_ALERTS = FeatureFlagKey(
  'WALLET_SECURITY_ALERTS',
);

/**
 * Runtime-configurable payload for {@link FEATURE_FLAG_WALLET_SECURITY_ALERTS},
 * keyed by exploit id (e.g. deterministicNonce202606) so each finding is independently
 * enabled and configured. URLs and copy override the i18n defaults when set.
 */
export type WalletSecurityAlertsFeatureFlagPayload = {
  exploits?: Record<
    string,
    {
      enabled?: boolean;
      infoUrl?: string;
      copy?: {
        banner?: string;
        nameSuffix?: string;
        alert?: string;
      };
    }
  >;
};
/**
 * Lower bound (epoch ms) for the proactive security re-scan: the SecondFi/Yoroi
 * defective signer first appeared in December 2025, so only transactions at or
 * after this point can be compromised. Scanning earlier history would waste
 * provider calls.
 */
export const SECURITY_SCAN_WINDOW_START = Timestamp(
  Date.parse('2025-12-01T00:00:00Z'),
);

export const LOVELACE_TOKEN_ID = TokenId('lovelace');
export const ADA_DECIMALS = 6;
export const COLLATERAL_AMOUNT_LOVELACES = 5_000_000; // 5 ADA in lovelace
export const CARDANO_TOKEN_METADATA_SCHEMA_VERSION = 1;

/**
 * Slot distance past a top on-chain activity's slot at which we treat an
 * unchanged UTxO fetch as authoritative. Below this depth, the indexer may
 * still be catching up with the activity (Blockfrost/Carp lag), so the
 * UTxO-fetch cache key is not advanced and the natural trigger keeps
 * re-fetching on each tip tick.
 *
 * Cardano slots are 1 second; Cardano blocks land roughly every 20 slots
 * on mainnet (active slot coefficient 0.05). 60 slots ≈ 3 blocks — long
 * enough for typical Blockfrost/Carp indexer lag to clear after a tx
 * confirms.
 */
export const UTXO_SYNC_CONFIRMATION_DEPTH = 60;

/**
 * Slot distance past a top non-Pending activity's slot at which we treat an
 * unchanged `getRewardAccountInfo` fetch as authoritative. Mirrors
 * `UTXO_SYNC_CONFIRMATION_DEPTH` but kept as a separate constant so per-
 * endpoint tuning is possible if Blockfrost's reward-account endpoint shows
 * different indexer lag than its UTxO endpoint.
 */
export const REWARD_ACCOUNT_DETAILS_SYNC_CONFIRMATION_DEPTH = 60;

export const supportedNetworkMagics = [
  Cardano.NetworkMagics.Mainnet,
  Cardano.NetworkMagics.Preprod,
  Cardano.NetworkMagics.Preview,
] as const;

export const supportedNetworkIds = new Map<
  BlockchainNetworkId,
  (typeof supportedNetworkMagics)[number]
>(supportedNetworkMagics.map(magic => [CardanoNetworkId(magic), magic]));
