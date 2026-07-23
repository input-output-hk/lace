/**
 * `@lace-lib/vendor` — the single re-export seam over the trusted external SDK
 * surface ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * The privileged host closure (ADR 37) depends on `@cardano-sdk/*` **only**
 * through this lib, which it vendors as a committed,
 * **no-minify built bundle** (`npm run build` → `dist/`, the @cardano-sdk surface inlined)
 * so an SDK bump shows up as one reviewable diff of the actual production code — the audit
 * chokepoint. Workspace members resolve this `src` directly; the privileged
 * closure consumes the built bundle (ADR 37). cardano-js-sdk is Lace-maintained and in
 * maintenance mode (rare updates) ⇒ very low supply-chain risk, which is what justifies
 * depending on it directly rather than re-deriving it.
 *
 * Keep this an **exact-surface** re-export — add only the symbols consumers
 * actually need; never re-export a package wholesale. Besides the `@cardano-sdk`
 * namespaces below, this seam is also the host's SINGLE admission point for the few
 * **non-SDK** externals its first-party libs need — `buffer` (runtime) and type-fest's
 * `Tagged` (type-only). Funneling them here keeps every first-party lib admitted into the closure
 * 100% first-party (no direct external import or global),
 * so every external the privileged closure bundles is audited in this one built artifact
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 */
export {
  Bip32Account,
  emip3decrypt,
  emip3encrypt,
  KeyRole,
  util,
} from '@cardano-sdk/key-management';
export * as Crypto from '@cardano-sdk/crypto';
export { Cardano } from '@cardano-sdk/core';
export type { HexBlob } from '@cardano-sdk/util';

// Non-SDK externals, funneled through the same audited seam (see header): `buffer` is
// the runtime polyfill core's byte value-objects use; type-fest's `Tagged` is the
// type-only nominal-typing primitive behind every value object (ADR 13).
export { Buffer } from 'buffer';
export type { Tagged } from 'type-fest';

// noble/scure-grade crypto primitives for the SBV1 SecretBox scheme (Argon2id +
// ChaCha20-Poly1305): the SDK provides only EMIP-003, so these enter here rather
// than being imported directly by core, keeping core first-party (ADR 37).
export { argon2idAsync } from '@noble/hashes/argon2';
export { randomBytes } from '@noble/hashes/utils';
export { chacha20poly1305 } from '@noble/ciphers/chacha.js';
