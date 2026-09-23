/**
 * Lace's per-network Blockfrost access for the RealFi module. Lace routes all
 * Blockfrost traffic through its own proxy (audit LW-14499): the per-network
 * `clientConfig` carries the proxy `baseUrl` (`<proxy>/<surface>/<network>`)
 * and normally NO `projectId` — the proxy injects the key server-side. These
 * helpers mirror the join + header semantics of the core provider's
 * `getBlockfrostClient` so RealFi's direct REST reads and its Blaze provider
 * hit exactly the same endpoints as the rest of the wallet.
 */

import { realfiDebugLog } from '@lace-contract/realfi-staking';

/**
 * Structural slice of Lace's `BlockfrostClientConfig` (ADR-14: read from the
 * runtime config; no import of the blockfrost provider module).
 */
export type RealFiBlockfrostConfig = {
  baseUrl: string;
  projectId?: string;
  apiVersion?: string;
};

/** REST base: `<baseUrl>/api/<version>` — the same join Lace's client uses. */
export const blockfrostRestBase = (config: RealFiBlockfrostConfig): string =>
  `${config.baseUrl.replace(/\/$/, '')}/api/${config.apiVersion ?? 'v0'}`;

/**
 * Request headers: `project_id` is omitted entirely when no key is configured
 * (the proxy path) — some gateways reject a present-but-empty auth header
 * (mirrors `getBlockfrostClient` in cardano-provider-core).
 */
export const blockfrostRestHeaders = (
  config: RealFiBlockfrostConfig,
): Record<string, string> =>
  config.projectId ? { project_id: config.projectId } : {};

/**
 * The chain tip's absolute slot (`/blocks/latest`), or `undefined` on any
 * read failure. The era-proof time reference for timelock slots: claimability
 * is `unlockSlot <= tip`, and the exact wall-clock is
 * `now + (unlockSlot - tip)` seconds — the delta always falls inside the
 * 1-second-slot Shelley era, unlike deriving wall-clock from a network's
 * system start, which drifts ~19 days across preprod's 20-second Byron slots.
 */
export const fetchChainTipSlot = async (
  config: RealFiBlockfrostConfig,
): Promise<number | undefined> => {
  try {
    const response = await fetch(
      `${blockfrostRestBase(config)}/blocks/latest`,
      { headers: blockfrostRestHeaders(config) },
    );
    if (!response.ok) {
      throw new Error(`Blockfrost /blocks/latest failed: ${response.status}`);
    }
    const { slot } = (await response.json()) as { slot?: number };
    return typeof slot === 'number' ? slot : undefined;
  } catch (error) {
    realfiDebugLog('chain tip read failed', { error });
    return undefined;
  }
};
