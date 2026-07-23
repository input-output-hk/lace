# @lace-lib/core

Framework-free shared primitives reused across the wallet's compartments, so
they all derive **byte-identical** results from the **same** code.

This is one of the designated shared internal libraries admitted into the
privileged host dependency closure
([ADR 37](../../../docs/adr/37-host-supply-chain-isolation.md)). It must stay
**framework-free** — no redux / rxjs / react. Its only runtime dependency is
[`@lace-lib/vendor`](../vendor), the single re-export seam over the trusted
`@cardano-sdk` surface: the composites here are thin wrappers over the SDK rather
than hand-maintained re-implementations, because cardano-js-sdk is Lace-maintained
and in maintenance mode (rare updates) ⇒ very low supply-chain risk, and depending
on it directly makes every compartment **byte-identical by construction** (no
cloned-vector equivalence gate needed).

## What lives here

| Primitive                         | Module          | Sync? | Notes                                                                       |
| --------------------------------- | --------------- | ----- | --------------------------------------------------------------------------- |
| emip3 (EMIP-003) encrypt/decrypt  | `src/emip3`     | async | re-exported from `@cardano-sdk/key-management`; keeps a vault blob portable |
| walletId derivation               | `src/wallet-id` | sync  | double blake2b-128 of the account xpub / mnemonic (`@cardano-sdk/crypto`)   |
| CIP-19 address encoder            | `src/address`   | sync  | base / reward address from credentials (`@cardano-sdk/core`)                |
| BLAKE2b-224 key hash              | `src/key-hash`  | sync  | Ed25519 public key → credential hash (`@cardano-sdk/crypto`)                |
| BIP32-Ed25519 key-path derivation | `src/key-path`  | async | soft public-child derivation; async libsodium init (`SodiumBip32Ed25519`)   |

The full account-xpub → `GroupedAddress` derivation is **not** re-composed here:
`Bip32Account` is re-exported from `@cardano-sdk/key-management` through the
[`@lace-lib/vendor`](../vendor) seam, so consumers get the SDK's own derivation
byte-identically.

Key derivation (`key-path`) is **async**: `@cardano-sdk`'s
bip32-ed25519 derivation has no zero-setup sync path (libsodium init is async; the
CML strategy needs a wasm module injected). Callers `await` it.
