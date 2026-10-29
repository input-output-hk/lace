# @lace-lib/cardano-crypto

Ported from [cardano-js-sdk](https://github.com/input-output-hk/cardano-js-sdk)'s `@cardano-sdk/crypto` (version 0.4.7); published as part of `@laceio/cardano`.

This package provides a set of high level primitives to perform hashing, signature generation/verification, import
private keys from BIP39 mnemonics, and derive BIP32-Ed25519 extended signing keys. An [audit](./AUDIT.md) of the
libsodium implementation was conducted in November 2023.
