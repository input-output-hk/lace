// The Bitcoin libraries this seam admits (index.ts).

// Bitcoin signing & derivation externals — the host's Bitcoin sealing, data
// plane, and sign surfaces reach these through the same audited seam, mirroring
// the symbols packages/module/blockchain-bitcoin imports. bip39 is pinned to
// 3.0.4 to match the `@cardano-sdk/key-management` transitive the Cardano
// seam (seam-cardano.ts) already inlines, so esbuild dedupes to a single bip39
// copy.
export {
  address,
  crypto,
  initEccLib,
  networks,
  payments,
  Psbt,
  script,
  Transaction,
} from 'bitcoinjs-lib';
export type { Network, Signer } from 'bitcoinjs-lib';
// secp256k1 exposes only named functions (no default), so the namespace form
// matches the `import * as ecc` shape `initEccLib(ecc)` expects (cf. `Crypto`
// in seam-cardano.ts).
export * as secp256k1 from '@bitcoinerlab/secp256k1';
export { HDKey } from '@scure/bip32';
export { mnemonicToSeedSync } from 'bip39';
