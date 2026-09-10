/**
 * `@lace-lib/vendor/midnight` — the single admission entrypoint for the Midnight
 * engine runtime ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 * This is a HEAVY co-load group kept OFF the `/index` surface (the SW /
 * ceremony bundles must never grow the engine tree — the split is structural,
 * pinned by the build's `LIGHT_ENTRY_EXCLUSIONS`).
 *
 * SOLE CONSUMER: the offscreen engine document
 * (`apps/lace-extension-shell/src/offscreen/midnight-engine.ts`), reached only
 * through offscreen.ts's dynamic import so a pre-warm-only document never
 * instantiates the WASM. Each wasm-bindgen engine this surface reaches (the
 * ledger-v8 engine today) rides the built bundle as a COMMITTED hashed `.wasm`
 * binary asset (the vendor build's `wasm-bindgen` plugin) — not text-diffable,
 * so its integrity gate is the rebuild-byte-compare CI plus the partner-assisted
 * engine audit ADR 37 names.
 *
 * Exact-surface re-export: only the symbols midnight-engine.ts imports, in the
 * form it uses them (`ledger` as a namespace, the rest named). Their transitive
 * trees (the wallet-sdk umbrella's facade/dust/unshielded implementations, the
 * effect runtime, the onchain/zkir engines) are pinned by the workspace lockfile.
 */
export * as ledger from '@midnight-ntwrk/ledger-v8';
export {
  DustAddress,
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
export {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnightntwrk/wallet-sdk';
export { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
export { DustWallet } from '@midnightntwrk/wallet-sdk/dust';
export { WalletFacade } from '@midnightntwrk/wallet-sdk/facade';
export type {
  BalancingRecipe,
  CombinedTokenTransfer,
  DefaultConfiguration,
  FacadeState,
} from '@midnightntwrk/wallet-sdk/facade';
export { ShieldedWallet } from '@midnightntwrk/wallet-sdk/shielded';
export {
  createKeystore,
  PublicKey,
  UnshieldedWallet,
} from '@midnightntwrk/wallet-sdk/unshielded';
