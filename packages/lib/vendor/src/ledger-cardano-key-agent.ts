/**
 * `@lace-lib/vendor/ledger-cardano-key-agent` — the Ledger Cardano SIGNING tree,
 * a HEAVY co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * CONSUMER: the Cardano signer surface (`surfaces/ledger-signer.ts`), which
 * builds a `LedgerKeyAgent` over the paired device and runs the SDK's
 * tx→device signing. This is the tree the light pairing / verify-address entries
 * (`/ledger-cardano-app`, `/webhid`) must NEVER pull (`LIGHT_ENTRY_EXCLUSIONS`) —
 * a pairing document has no reason to load the signer + its libsodium WASM.
 *
 * ONE entry for the whole signing interop: besides `LedgerKeyAgent` itself, the
 * signer constructs the agent from `@cardano-sdk/crypto` (`Bip32PublicKeyHex`,
 * `SodiumBip32Ed25519`) and `@cardano-sdk/key-management` (`CommunicationType`,
 * `KeyPurpose`, the `SignTransactionContext` type), so those interop symbols are
 * re-exported HERE — the surface consumes a single vendor entry instead of four
 * direct `@cardano-sdk` dynamic imports. With `splitting: true` these dedupe into
 * shared chunks with `/index`, so there is one `@cardano-sdk` copy per document
 * (the entrypoint-split point, ADR 37).
 */
export { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
export { Bip32PublicKeyHex, SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
export { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
export type { SignTransactionContext } from '@cardano-sdk/key-management';
