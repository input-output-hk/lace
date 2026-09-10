import { CardanoNetworkId } from '@lace-contract/cardano-context';
import {
  catchError,
  combineLatest,
  defer,
  EMPTY,
  filter,
  ignoreElements,
  map,
  retry,
  switchMap,
} from 'rxjs';

import type { SideEffect } from '../..';
import type { BlockchainName } from '@lace-lib/util-store';

/** Retries of a failed active-network write-back before the guest gives up
 * until the next network change. Bounded so a host that keeps refusing does not
 * keep its service worker awake. */
const PUSH_RETRIES = 3;
const PUSH_RETRY_DELAY_MS = 5000;

/** The one active-network entry the host consumes for dapp grant validation
 * (ADR 41); other blockchains' active networks are the host's concern only
 * for Cardano's dapp hub. */
const CARDANO: BlockchainName = 'Cardano';

/**
 * Write the guest's active Cardano network back to the host (ADR 41
 * `lace.settings`) on boot and on every change, so the host's dapp hub
 * validates a dapp grant against the network the guest is on (a mismatch
 * answers CIP-30 `-4 AccountChange`). The host holds no active-network context
 * of its own (ADR 33), so without this write-back a grant on any provisioned
 * network serves forever regardless of what the guest switched to.
 *
 * Write-through only — it dispatches NO action (the host record is the effect).
 *
 * - FEATURE-GATED (ADR 41 handshake): an older host without the
 *   `settings.setActiveNetwork` capability (`canSetActiveNetwork` false) makes
 *   this a silent no-op — the guest degrades rather than firing a doomed call.
 * - WIRE-ERROR TOLERANT (ADR 15): a failed write-back is retried, then
 *   swallowed — it never breaks the guest, and the host meanwhile falls back to
 *   provisioned-only grant validation.
 */
export const pushActiveNetwork: SideEffect = (
  _,
  { network: { selectBlockchainNetworks$, selectNetworkType$ } },
  { canSetActiveNetwork, pushActiveCardanoNetwork },
) => {
  if (!canSetActiveNetwork) return EMPTY;
  // The dedupe latch. It advances ONLY on a recorded push, because a rejected
  // wire call is not how a failure arrives: `lace.request` never rejects, it
  // answers a typed `{ ok: false }`. Deduping on the emitted value alone would
  // therefore treat a failed write-back as recorded and suppress every later
  // push, leaving the host validating dapp grants against the wrong network for
  // the rest of the session.
  let recordedNetworkMagic: number | undefined;
  return combineLatest([selectBlockchainNetworks$, selectNetworkType$]).pipe(
    map(([blockchainNetworks, networkType]): number | undefined => {
      const activeId = blockchainNetworks[CARDANO]?.[networkType];
      const chainId = activeId
        ? CardanoNetworkId.getChainId(activeId)
        : undefined;
      // getChainId returns undefined for a non-Cardano / unknown id — skip it
      // rather than pushing a bogus magic.
      return chainId ? Number(chainId.networkMagic) : undefined;
    }),
    filter(
      (networkMagic): networkMagic is number =>
        networkMagic !== undefined && networkMagic !== recordedNetworkMagic,
    ),
    switchMap(networkMagic =>
      defer(() => pushActiveCardanoNetwork(networkMagic)).pipe(
        map(result => {
          if (!result.ok) throw new Error(result.error.message);
          recordedNetworkMagic = networkMagic;
          return result;
        }),
        retry({ count: PUSH_RETRIES, delay: PUSH_RETRY_DELAY_MS }),
        catchError(() => EMPTY),
        ignoreElements(),
      ),
    ),
  );
};
