/**
 * `@lace-lib/vendor/ledger-cardano-app` — the ledgerjs Cardano app
 * (`@cardano-foundation/ledgerjs-hw-app-cardano`), a LIGHT co-load group
 * ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md)).
 *
 * CONSUMERS: the pairing (`surfaces/hw-pair.ts`) and verify-address
 * (`surfaces/ledger-verify-address.ts`) surfaces, which probe the device and
 * extract the xpub / show an address through the `Ada` app DIRECTLY — never
 * through `@cardano-sdk/hardware-ledger`'s `LedgerKeyAgent` (ADR 44). The split
 * is STRUCTURAL, not a tree-shaking hope: this entry must NEVER pull the
 * key-agent signing tree (pinned by the build's `LIGHT_ENTRY_EXCLUSIONS`), so a
 * pairing / verify document loads without the signer + its libsodium WASM.
 *
 * Exact-surface re-export: the default `Ada` app class (the value the surfaces
 * `new`, and the `import type AdaApp` form) + `AddressType` (verify-address maps
 * the address kind). Nothing else — `HARDENED` is duplicated surface-side as a
 * literal to keep those modules' static graphs ledgerjs-free.
 */
export {
  AddressType,
  default,
} from '@cardano-foundation/ledgerjs-hw-app-cardano';
