/**
 * `@lace-lib/vendor/trezor-cardano` — the Trezor Cardano SIGNING tree
 * (`@cardano-sdk/hardware-trezor`), a HEAVY co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md), ADR 37 ).
 *
 * CONSUMER: the Cardano Trezor signer surface (`surfaces/trezor-signer.ts`),
 * which constructs a `TrezorKeyAgent` over the paired device's xpub and runs the
 * SDK's tx→device signing. The chain-agnostic Connect runtime is the SEPARATE
 * `/trezor-connect` entry (this tree's internal `@trezor/connect-web` import is
 * build-aliased to the SAME webextension copy the split hoists per document, so
 * the agent's Connect singleton is the one the surface init/dispose reach).
 *
 * ONE entry for the whole signing interop: besides `TrezorKeyAgent` itself, the
 * signer constructs the agent from `@cardano-sdk/crypto` (`Bip32PublicKeyHex`,
 * `SodiumBip32Ed25519`) and `@cardano-sdk/key-management` (`CommunicationType`,
 * `KeyPurpose`, the `SignTransactionContext` type), so those interop symbols are
 * re-exported HERE — the surface consumes a single vendor entry instead of four
 * direct `@cardano-sdk` / `@trezor` dynamic imports. With `splitting: true` these
 * dedupe into shared chunks with `/index`, so there is one `@cardano-sdk` copy
 * per document (the ADR 37 point).
 */
export { TrezorKeyAgent } from '@cardano-sdk/hardware-trezor';
export { Bip32PublicKeyHex, SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
export { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
export type { SignTransactionContext } from '@cardano-sdk/key-management';
