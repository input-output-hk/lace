/**
 * `@lace-lib/vendor` — the single re-export seam over the trusted external SDK
 * surface ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * The privileged host closure (ADR 37) depends on `@cardano-sdk/*` **only**
 * through this lib, which it vendors as a committed,
 * **no-minify built bundle** (`npm run build` → `dist/`, the `@cardano-sdk` surface inlined)
 * so an SDK bump shows up as one reviewable diff of the actual production code — the audit
 * chokepoint. Workspace members resolve this `src` directly; the privileged
 * closure consumes the built bundle (ADR 37). cardano-js-sdk is Lace-maintained and in
 * maintenance mode (rare updates) ⇒ very low supply-chain risk, which is what justifies
 * depending on it directly rather than re-deriving it.
 *
 * Keep this an **exact-surface** re-export — add only the symbols consumers
 * actually need; never re-export a package wholesale. Besides the `@cardano-sdk`
 * namespaces (seam-cardano.ts), this seam is also the host's SINGLE admission point for the few
 * **non-SDK** externals it admits — `buffer` (runtime) and type-fest's `Tagged`
 * (type-only) for the first-party libs, plus the Bitcoin signing/derivation libs
 * (`bitcoinjs-lib`, `@bitcoinerlab/secp256k1`, `@scure/bip32`, `bip39`) the host's
 * Bitcoin surfaces need and the Midnight HD derivation leaf
 * (`@midnightntwrk/wallet-sdk-hd`) the host's Midnight sealing surfaces need.
 * Funneling them here keeps every first-party lib admitted into the closure
 * 100% first-party (no direct external import or global),
 * so every external the privileged closure bundles is audited in this one built artifact
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 */

// Each group of externals is its own module, re-exported here. A bundler
// resolves a re-export of a workspace module straight to that module, so a
// chunk that uses only the Cardano names loads the Cardano module alone, not
// the Bitcoin, Midnight or air-gapped libraries beside it.
export * from './seam-cardano';
export * from './seam-primitives';
export * from './seam-bitcoin';
export * from './seam-midnight-hd';
export * from './seam-air-gapped';
