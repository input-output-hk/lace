/**
 * The ADR 54 delivery runtime shared by every remotely served Lace guest: the
 * offline-first boot that may adopt another release before the UI is
 * interactive, plus the embedded-only gate that decides whether it boots at
 * all.
 *
 * A guest entry point is these two calls, in this order:
 *
 * ```ts
 * if (!applyEmbeddedGate({ allowStandalone })) {
 *   startBoot({ buildVersion });
 *   // …mount the UI; render a splash while getBootPhase() is 'loading'
 * }
 * ```
 *
 * Both arguments are the app's to supply: each guest's bundler bakes its own
 * version stamp and decides whether an unembedded run is allowed, so nothing
 * here reads build-time environment.
 *
 * Adopting a release NAVIGATES this document, and only ever while the phase is
 * 'loading' — so a UI that defers its own initialization until 'interactive'
 * cannot be torn down mid-session.
 */
export {
  getBootPhase,
  startBoot,
  subscribeToBoot,
  type BootPhase,
  type GuestBootState,
} from './boot';
export { applyEmbeddedGate } from './embedded-gate';
