import * as bitcoinEntry from '@laceio/sdk/bitcoin';
import * as rootEntry from '@laceio/sdk';

// The stable build's fixture; test/bitcoin-consumer-types.canary.mts covers
// the canary build. Bitcoin is canary (ADR 66): the stable Bitcoin entry
// exports nothing, and the stable root carries no Bitcoin exports.
// @ts-expect-error Bitcoin wallets are canary.
void bitcoinEntry.createLaceWallet;
// @ts-expect-error Bitcoin modules are canary.
void bitcoinEntry.m;
// @ts-expect-error Bitcoin modules are canary.
void rootEntry.m.blockchainBitcoin;
// @ts-expect-error The Bitcoin feature flag is canary.
void rootEntry.BITCOIN_FEATURE_FLAG;
// @ts-expect-error The Bitcoin lazy vault is canary.
void rootEntry.createBitcoinLazyInMemoryVaultModule;
// @ts-expect-error Bitcoin transaction building is canary.
void bitcoinEntry.buildBitcoinTx;
// @ts-expect-error Bitcoin transaction signing is canary.
void rootEntry.signBitcoinTx;
// @ts-expect-error Bitcoin transaction submission is canary.
void rootEntry.submitBitcoinTx;
// @ts-expect-error Bitcoin transaction building is canary.
void rootEntry.buildBitcoinTx;
