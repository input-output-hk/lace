import { FeatureFlagKey } from '@lace-contract/feature';

import type { AccountId } from '@lace-contract/wallet-repo';

// The gating flag. `@lace-contract/midnight-context` does NOT export a
// `FEATURE_FLAG_MIDNIGHT` constant — both monolith Midnight modules
// (`blockchain-midnight`, `midnight-sync`) declare it locally with this exact
// value, so re-declaring the identical `FeatureFlagKey('BLOCKCHAIN_MIDNIGHT')`
// here is the ADR-14 "duplicate rather than import from another module"
// pattern; importing it from either module would violate ADR 14.
export const FEATURE_FLAG_MIDNIGHT = FeatureFlagKey('BLOCKCHAIN_MIDNIGHT');

// Same duplicate-constant rationale: the unshielded gate mirrors the monolith
// watch effects (Midnight surfaces the unshielded address/tokens only when the
// flag is on). It ships ON in both default lists (monolith and guest) — it
// gates the unshielded half of the poll: address, NIGHT balances, metadata,
// and the unshielded share of sync progress.
export const FEATURE_FLAG_MIDNIGHT_UNSHIELDED = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_UNSHIELDED',
);

/** How often the guest re-pulls `midnight.getSyncStatus` + `getState` while a
 * Midnight account is active. Modest fixed interval (there is no tip
 * subscription on the wire, unlike the Cardano composite provider); the poll is
 * `whileActive`-gated so it pauses while the app is locked. */
export const STATE_POLL_INTERVAL_MS = 10_000;

/** How long the cold-engine `requestSync` poke stays silent after firing
 * (store/side-effects/watch.ts). Orders of magnitude above the poll interval, so
 * the poke never becomes the per-tick prompt ADR 47 warns about, yet a cold
 * engine the user left cold — a dismissed unlock surface — is retried within the
 * session instead of freezing the projection until the app reloads. */
export const COLD_RESTART_RETRY_INTERVAL_MS = 5 * 60_000;

/** Retries of a failed active-network write-back
 * (store/side-effects/push-active-network.ts) before the guest gives up until
 * the next network change. Bounded so a host that keeps refusing does not keep
 * its service worker awake. */
export const ACTIVE_NETWORK_PUSH_RETRIES = 3;
export const ACTIVE_NETWORK_PUSH_RETRY_DELAY_MS = 5000;

/** The shared per-account sync operation id (ADR 12; identical to the monolith
 * `watch.ts` `${accountId}-midnight-sync`). */
export const midnightSyncOperationId = (accountId: AccountId): string =>
  `${accountId}-midnight-sync`;
