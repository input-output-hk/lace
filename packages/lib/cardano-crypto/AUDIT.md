# Security audit

The BIP32-Ed25519 key derivation in this package (`src/Bip32/Bip32KeyDerivation.ts`) was reviewed in November 2023,
at cardano-js-sdk commit e7e2e6f1. The [report](./audit_202311.pdf) raised three findings in the derivation
arithmetic, and the feedback was addressed in <https://github.com/input-output-hk/cardano-js-sdk/pull/1004>. The
implementation under review was added in <https://github.com/input-output-hk/cardano-js-sdk/pull/574>.
