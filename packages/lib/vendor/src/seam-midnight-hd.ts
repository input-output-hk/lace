// The Midnight HD derivation this seam admits (index.ts).

// Midnight HD derivation — the host's Midnight sealing surfaces derive the
// per-role keys (Zswap / Dust / NightExternal) from a BIP-39 seed through this
// same audited seam, mirroring what
// packages/module/midnight-sync/.../in-memory-wallet-integration-factory
// imports from `@midnightntwrk/wallet-sdk/hd`. That subpath is a bare
// `export * from '@midnightntwrk/wallet-sdk-hd'`, so depending on the leaf
// directly yields BYTE-IDENTICAL derivation. The leaf is PURE JS (deps
// `@scure/bip32@^2.0.1` + `@scure/bip39@^2.0.1`) — it pulls NO
// `@midnight-ntwrk/ledger-v8` or other WASM into the closure (the engine
// runtime stays a direct host dep, ADR 37 / ADR 47). `@scure/bip32` dedupes
// against the 2.0.1 this package pins for the Bitcoin seam (seam-bitcoin.ts);
// `@scure/bip39@2.0.1` arrives transitively and dedupes to the workspace's
// single copy, mirroring the bip39 3.0.4 precedent there. Only the seed-based
// `HDWallet.fromSeed` path is used (no mnemonic util), so `@scure/bip39`
// tree-shakes out of the built bundle.
export { HDWallet, Roles } from '@midnightntwrk/wallet-sdk-hd';
