/**
 * `@lace-lib/vendor/ledger-bitcoin` — the Ledger Bitcoin app client
 * (`ledger-bitcoin`) ([ADR 37](../../../../docs/adr/37-host-supply-chain-isolation.md),
 * ADR 37).
 *
 * CONSUMERS: the enable-Bitcoin pairing fan-out (`surfaces/hw-pair.ts`) and the
 * Bitcoin confirm-on-device signer (`surfaces/btc-ledger-signer.ts`), which
 * probe/export through `AppClient` and sign through the `wpkh(@0/**)` default
 * policy. Its `bitcoinjs-lib`/`@bitcoinerlab/secp256k1` transitives are the very
 * packages the `/index` entry bundles, so `splitting` dedupes them into shared
 * chunks — one copy per document by construction (the drift risk the earlier
 * pin+overrides plan managed by hand). The device transport rides the separate
 * `/webhid` entry.
 *
 * Exact-surface re-export: `AppClient` (probe/export/sign) +
 * `DefaultWalletPolicy` (the signer's wallet policy). The surfaces keep their
 * per-input signature and app subsets STRUCTURAL, so no types are needed here.
 */
export { AppClient, DefaultWalletPolicy } from 'ledger-bitcoin';
