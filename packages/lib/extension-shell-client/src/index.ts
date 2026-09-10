// The guest-side runtime client for the host-injected `window.lace` provider
// (ADR 41), shared by the guest app and the host-pull modules (ADR 14: lib is
// the one place both may import runtime code from). The wire shapes come from
// @lace-lib/extension-shell-api — deliberately a SEPARATE, types-only lib: the
// host vendors that one as first-party source (ADR 37), so runtime code like
// this must never live there.

import { concatMap, filter, from, map, race, take, timer } from 'rxjs';

import type {
  LaceCapability,
  LaceMethodParams,
  LaceMethodResult,
  LaceProvider,
  LaceResult,
} from '@lace-lib/extension-shell-api';
import type { Observable } from 'rxjs';

export const getLace = (): LaceProvider | undefined =>
  (globalThis as typeof globalThis & { lace?: LaceProvider }).lace;

/** Whether the host advertised `capability` in its handshake set (ADR 41). A
 * guest-side feature gate: a capability absent from an older host is treated
 * as unsupported, so the caller no-ops instead of firing a doomed request. */
export const hasLaceCapability = (capability: LaceCapability): boolean =>
  getLace()?.capabilities.includes(capability) ?? false;

type RequestParams<M extends LaceCapability> =
  LaceMethodParams<M> extends undefined ? [] : [params: LaceMethodParams<M>];

export const request = async <M extends LaceCapability>(
  method: M,
  ...[params]: RequestParams<M>
): Promise<LaceResult<LaceMethodResult<M>>> => {
  const lace = getLace();
  if (!lace) {
    return {
      ok: false,
      // Guest-synthesized code (outside the host-emitted LaceErrorCode set —
      // the wire type is deliberately open, see the shared contract lib).
      error: { code: 'unavailable', message: 'window.lace is not injected' },
    };
  }
  return (await lace.request(method, params)) as LaceResult<
    LaceMethodResult<M>
  >;
};

/** How often a ceremony result is polled. */
const POLL_INTERVAL_MS = 1000;
/**
 * Upper bound on how long the guest waits for a host ceremony before treating
 * it as never settling — guards the edge where the host surface is killed
 * without tearing the ceremony down, so the poll would otherwise never settle.
 */
const POLL_CEILING_MS = 15 * 60 * 1000;

/**
 * Poll a host ceremony until the caller's classify tail reports a settled
 * outcome (anything with `kind !== 'pending'`), racing a ceiling that yields
 * `ceilingOutcome` for a ceremony that never settles.
 */
export const pollCeremonyOutcome = <TOutcome extends { kind: string }>(
  poll: () => Promise<TOutcome>,
  ceilingOutcome: TOutcome,
): Observable<TOutcome> =>
  race(
    timer(0, POLL_INTERVAL_MS).pipe(
      concatMap(() => from(poll())),
      filter(outcome => outcome.kind !== 'pending'),
      take(1),
    ),
    timer(POLL_CEILING_MS).pipe(map(() => ceilingOutcome)),
  );
