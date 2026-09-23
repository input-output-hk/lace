// Pull-based liveness for the host hardware-pairing ceremony (ADR 36).
//
// The ceremony runs in its own host-origin window and resolves on MOUNT: nothing
// is reported back when it settles, so a pairing the user CANCELLED — by closing
// that window — leaves the guest with no signal at all. The picker's in-flight
// notice therefore has to be retracted on evidence the guest can gather ITSELF,
// and the only evidence there is is whether the window still exists.
//
// PULL, never push (ADR 41): the host answers `wallets.requestConnectHardware`
// with `{ probe: true }` observe-only — it opens nothing and reports whether a
// pairing window is mounted. That is an additive param, not a new capability
// (ADR 35), which is also why the watcher below must ARM before it may conclude
// anything: a host predating the param treats the probe as an ordinary request.

import { request } from '@lace-lib/extension-shell-client';

/** How often the pairing window is probed. Fast enough that the notice retracts
 * about as quickly as the user's attention returns to the panel, slow enough
 * that a long air-gapped exchange costs a negligible number of round-trips. */
const PAIRING_PROBE_INTERVAL_MS = 750;

/** Answers whether a host pairing window is mounted right now. Injected so the
 * watcher is testable without a `window.lace`. */
type PairingWindowProbe = () => Promise<boolean>;

/**
 * Ask the host whether a pairing window is currently mounted. A refused or
 * unavailable answer (no `window.lace`, an older host, an error result) reports
 * `false` — which the watcher reads as "no evidence", never as "cancelled",
 * because it has to see `true` first.
 */
export const probePairingWindow: PairingWindowProbe = async () => {
  const result = await request('wallets.requestConnectHardware', {
    probe: true,
  });
  return result.ok && result.value.mounted;
};

/**
 * Call `onClosed` once the host pairing window has been seen open and then gone.
 * Returns a cancel function; call it when the caller stops caring (the notice was
 * retracted some other way, or the component unmounted).
 *
 * ARMS on the first `true`, and only an ARMED watcher may conclude. Two reasons,
 * both of which would otherwise retract a live pairing: the window takes a moment
 * to appear after the request, and a host that does not understand the probe
 * param answers as if nothing were open forever. An unarmed watcher therefore
 * polls harmlessly until cancelled, leaving the caller's own fallback in charge.
 *
 * A probe that THROWS while armed is treated as "still open": an SW restart
 * mid-ceremony must not read as a cancellation.
 */
export const watchPairingWindow = (
  probe: PairingWindowProbe,
  onClosed: () => void,
  intervalMs: number = PAIRING_PROBE_INTERVAL_MS,
): (() => void) => {
  let isCancelled = false;
  let isArmed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async (): Promise<void> => {
    const isOpen = await probe().catch(() => isArmed);
    if (isCancelled) return;
    if (isOpen) {
      isArmed = true;
    } else if (isArmed) {
      onClosed();
      return;
    }
    timer = setTimeout(() => void tick(), intervalMs);
  };

  timer = setTimeout(() => void tick(), intervalMs);
  return () => {
    isCancelled = true;
    if (timer !== undefined) clearTimeout(timer);
  };
};
