/**
 * `@lace-lib/vendor/trezor-connect` — the chain-agnostic Trezor Connect runtime
 * (`@trezor/connect-webextension`), a LIGHT co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md), ADR 37 ).
 *
 * CONSUMERS: every host ceremony surface that drives a Trezor over the remote
 * connect.trezor.io popup — Cardano + Bitcoin pairing and signing — reaches this
 * runtime through `surfaces/trezor-connect.ts`'s `loadTrezorTree()`. The runtime
 * is CHAIN-AGNOSTIC (one Connect instance serves both chains), so this entry
 * must NEVER pull the Cardano signing tree (`@cardano-sdk/hardware-trezor`, the
 * separate `/trezor-cardano` entry) or the Midnight engine — pinned structurally
 * by the build's `LIGHT_ENTRY_EXCLUSIONS`.
 *
 * The specifier is `@trezor/connect-web` — the SAME aliased name
 * `@cardano-sdk/hardware-trezor` hard-codes internally. tsc resolves it to
 * connect-web@9.4.0's real types (its `main` sibling `.d.ts` carries the default
 * `TrezorConnect`), while the build's exact-specifier alias rewrites it to the
 * DOM-free `@trezor/connect-webextension` runtime `main` (the connect-web@9.4.0
 * CoreInIframe variant is SW-impossible and never bundles). So the Cardano
 * signer's internal Connect singleton and this entry's default resolve to the
 * ONE webextension copy the split hoists per document.
 *
 * Exact-surface re-export: only the default (the `TrezorConnect` object the
 * surfaces cast to their locally-typed `TrezorConnectApi`). No named types —
 * `surfaces/trezor-connect.ts` types the Connect surface locally, decoupled from
 * the aliased package's own (version-skewed) type graph (ADR 44).
 */
export { default } from '@trezor/connect-web';
