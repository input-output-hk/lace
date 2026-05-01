# @input-output-hk/lace-sdk

Headless SDK for the Lace wallet platform. Create and manage Cardano wallets programmatically with Web3Auth social login, reactive state observables, and a modular architecture.

## Installation

The package is published to [GitHub Packages](https://github.com/input-output-hk/lace-platform/packages). You need to configure npm to use the GitHub registry for the `@input-output-hk` scope.

### 1. Authenticate with GitHub Packages

Create a [personal access token](https://github.com/settings/tokens) (classic) with `read:packages` scope, then log in:

```bash
npm login --scope=@input-output-hk --registry=https://npm.pkg.github.com
```

Or add it directly to your project's `.npmrc`:

```ini
# .npmrc
@input-output-hk:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### 2. Install

```bash
npm install @input-output-hk/lace-sdk
```

> **Note:** Published versions use the `dev` dist-tag (e.g., `0.1.0-dev.42`). To install the latest dev release:
>
> ```bash
> npm install @input-output-hk/lace-sdk@dev
> ```

## Quick Start

```typescript
import {
  createLaceWallet,
  FEATURE_FLAG_CARDANO,
  FEATURE_FLAG_NETWORK_TYPE,
  m,
} from '@input-output-hk/lace-sdk';

const wallet = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    m.blockchainCardano,
    m.cardanoProviderBlockfrost,
    m.cryptoCardanoSdk,
  ] as const,
  environment: 'development',
  featureFlags: [
    { key: FEATURE_FLAG_CARDANO },
    { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
  ],
  config: {
    /* see Configuration */
  },
});

// Subscribe to reactive state
wallet.stateObservables.addresses.selectAllAddresses$.subscribe(addresses => {
  console.log('Addresses:', addresses);
});

wallet.stateObservables.tokens.selectAllTokens$.subscribe(tokens => {
  console.log('Tokens:', tokens);
});

// Read state synchronously
const state = wallet.getState();
```

## Configuration

The SDK requires an `AppConfig` object with Blockfrost provider credentials and network settings.

```typescript
import {
  Cardano,
  FEATURE_FLAG_CARDANO,
  FEATURE_FLAG_NETWORK_TYPE,
  Milliseconds,
  type AppConfig,
} from '@input-output-hk/lace-sdk';

const featureFlags = [
  { key: FEATURE_FLAG_CARDANO },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];

const config: Partial<AppConfig> = {
  defaultFeatureFlags: featureFlags,
  extraFeatureFlags: [],
  defaultTestnetChainId: Cardano.ChainIds.Preprod,
  cardanoProvider: {
    tipPollFrequency: Milliseconds(30_000),
    transactionHistoryPollingIntervalSeconds: Milliseconds(30_000),
    blockfrostConfigs: {
      // Keyed by Cardano network magic
      1: {
        clientConfig: {
          baseUrl: 'https://cardano-preprod.blockfrost.io',
          apiVersion: 'v0',
          projectId: 'YOUR_PREPROD_PROJECT_ID',
        },
        rateLimiterConfig: {
          size: 500,
          increaseAmount: 10,
          increaseInterval: Milliseconds(1000),
        },
      },
      2: {
        clientConfig: {
          baseUrl: 'https://cardano-preview.blockfrost.io',
          apiVersion: 'v0',
          projectId: 'YOUR_PREVIEW_PROJECT_ID',
        },
        rateLimiterConfig: {
          size: 500,
          increaseAmount: 10,
          increaseInterval: Milliseconds(1000),
        },
      },
      764824073: {
        clientConfig: {
          baseUrl: 'https://cardano-mainnet.blockfrost.io',
          apiVersion: 'v0',
          projectId: 'YOUR_MAINNET_PROJECT_ID',
        },
        rateLimiterConfig: {
          size: 500,
          increaseAmount: 10,
          increaseInterval: Milliseconds(1000),
        },
      },
    },
  },
  cexplorerUrls: {
    1: 'https://preprod.cexplorer.io',
    2: 'https://preview.cexplorer.io',
    764824073: 'https://cexplorer.io',
  },
};
```

## Modules

The SDK uses a modular architecture. Pre-configured modules are available via the `m` namespace export:

### Feature Flags — `featureDev`

Static, in-memory feature flag evaluation. Feature flags are set at initialization time and remain fixed for the lifetime of the wallet. Suitable for development, testing, and applications where flags are known at build time.

**Platform alternative (not yet in SDK):** `feature-posthog` — evaluates flags dynamically via [PostHog](https://posthog.com/), allowing remote flag updates without redeploying.

### Storage — `storageInMemory`

Ephemeral in-memory key-value storage. State is lost when the process exits. Useful for serverless, testing, or short-lived sessions where persistence is not needed.

**Platform alternatives (not yet in SDK):**

- `storage-extension` — persists to `chrome.storage.local` (browser extensions)
- `storage-react-native-async` — persists to React Native AsyncStorage (mobile)

### Blockchain — `blockchainCardano`

Full Cardano blockchain integration: address discovery, UTXO management, token tracking, transaction building, delegation, and in-memory wallet signing.

**Platform alternatives (not yet in SDK):**

- `blockchain-bitcoin` — Bitcoin UTXO model, address validation, fee estimation
- `blockchain-midnight` — Midnight privacy blockchain with shielded contracts

Multiple blockchain modules can be loaded simultaneously — the wallet manages accounts across all active chains.

### Provider — `cardanoProviderBlockfrost`

Fetches on-chain Cardano data (UTXOs, transactions, stake info, network parameters) via the [Blockfrost](https://blockfrost.io/) API. Requires a Blockfrost project ID per network.

### Cryptography — `cryptoCardanoSdk`

Provides `bip32Ed25519` key derivation and `blake2b` hashing using the `@cardano-sdk` library.

**Platform alternative (not yet in SDK):** `crypto-apollo` — same cryptographic interface backed by the Apollo library.

### Usage

Pass modules to `createLaceWallet` using `as const` for full type inference:

```typescript
import { createLaceWallet, m } from '@input-output-hk/lace-sdk';

const wallet = await createLaceWallet({
  modules: [m.featureDev, m.storageInMemory, m.blockchainCardano, ...] as const,
  // ...
});
```

## Wallet API

### Creating a wallet

After initializing the SDK, create a wallet entity from a BIP39 mnemonic:

```typescript
import { createInMemoryWalletEntity } from '@input-output-hk/lace-sdk';

const walletEntity = await createInMemoryWalletEntity(wallet, {
  mnemonicWords: ['abandon', 'abandon' /* ... 24 words */],
  password: new Uint8Array(Buffer.from('your-password')),
  walletName: 'My Wallet',
});

wallet.dispatch('wallets.addWallet', walletEntity);
```

### State observables

The wallet exposes RxJS observables for reactive state access:

```typescript
// All addresses across accounts
wallet.stateObservables.addresses.selectAllAddresses$.subscribe(addresses => {
  console.log(addresses.map(a => a.address));
});

// All token balances
wallet.stateObservables.tokens.selectAllTokens$.subscribe(tokens => {
  console.log(`${tokens.length} tokens`);
});
```

### Dispatching actions

Use the type-safe `dispatch` function with `"scope.actionName"` syntax:

```typescript
wallet.dispatch('wallets.addWallet', walletEntity);
```

### Reading state synchronously

```typescript
const state = wallet.getState();
```

## Deriving a Mnemonic from Entropy

`Mnemonic.deriveFrom(entropyHex)` deterministically derives a 24-word BIP39 mnemonic from any 32-byte hex-encoded entropy. It applies HKDF domain separation internally — the raw entropy is never used directly as wallet seed material.

The entropy can come from any source: a Web3Auth social login private key, a hardware security module, a KDF output, etc.

```typescript
import {
  EntropyHex,
  Mnemonic,
  createInMemoryWalletEntity,
} from '@input-output-hk/lace-sdk';

// Any 32-byte hex string (e.g., from Web3Auth, an HSM, or a KDF)
const entropyHex = EntropyHex('ab'.repeat(32)); // 64 hex chars = 32 bytes

const mnemonicWords = Mnemonic.deriveFrom(entropyHex);
// => Tagged<string[], 'Mnemonic'> — 24 BIP39 words

const walletEntity = await createInMemoryWalletEntity(wallet, {
  mnemonicWords,
  password: new Uint8Array(Buffer.from('your-password')),
  walletName: 'My Wallet',
});

wallet.dispatch('wallets.addWallet', walletEntity);
```

## Transaction Building

Build Cardano transactions using `TransactionBuilder`. The builder requires network info (chain ID and protocol parameters) that becomes available after the Cardano provider syncs.

```typescript
import { createTxBuilder, waitForNetworkInfo } from '@input-output-hk/lace-sdk';

// Wait for chain ID and protocol parameters to be available
await waitForNetworkInfo(wallet);

// Create a builder pre-configured with the active network
const builder = createTxBuilder(wallet).unwrap();

// Build a simple ADA transfer
const tx = builder
  .setChangeAddress(senderAddress)
  .setUnspentOutputs(availableUtxos)
  .transferValue(recipientAddress, { coins: 1_230_000n })
  .expiresIn(900)
  .build();

// Serialize to CBOR hex
const cborHex = tx.toCbor();
```

`waitForNetworkInfo(wallet)` resolves once the provider has fetched protocol parameters — call it before `createTxBuilder` to guarantee success. `createTxBuilder` returns a `Result<TransactionBuilder, Error>` so callers can handle the not-ready case without exceptions.

## Transaction Signing

Sign a Cardano transaction using an in-memory wallet without the authentication prompt UI:

```typescript
import { signCardanoTx } from '@input-output-hk/lace-sdk';

const result = await signCardanoTx(wallet, {
  serializedTx: cborHex,
  password: new Uint8Array(Buffer.from('your-password')),
  // accountId is optional — required only when multiple Cardano
  // in-memory accounts exist on the active network
});

if (result.isOk()) {
  console.log('Signed tx:', result.value);
} else {
  console.error('Signing failed:', result.error.message);
}
```

`password` is optional at the type level to allow extending to other wallet types (e.g. Ledger) in the future, but is required at runtime for in-memory wallets.

Resolves with `Result<CardanoSignResult, Error>` — never rejects.

## Transaction Submission

Submit a signed Cardano transaction to the network:

```typescript
import { submitCardanoTx } from '@input-output-hk/lace-sdk';

const result = await submitCardanoTx(wallet, {
  serializedTx: signedCborHex,
});

if (result.isOk()) {
  console.log('Transaction submitted:', result.value.txId);
} else {
  console.error('Submission failed:', result.error.message);
}
```

Resolves with `Result<{ txId: Cardano.TransactionId }, Error>` — never rejects.

## Complete Example

A full working example with Web3Auth social login, wallet creation, and state subscriptions is available at [`lace-sdk-consumer`](https://github.com/mkazlauskas/lace-sdk-consumer).

## API Reference

### Functions

| Function                                    | Description                                               |
| ------------------------------------------- | --------------------------------------------------------- |
| `createLaceWallet(props)`                   | Create a headless wallet instance with modules and config |
| `createInMemoryWalletEntity(wallet, props)` | Create a password-protected wallet entity from a mnemonic |
| `Mnemonic.deriveFrom(entropyHex)`           | Derive a 24-word BIP39 mnemonic from hex-encoded entropy  |
| `createTxBuilder(wallet)`                   | Create a `TransactionBuilder` from wallet state           |
| `waitForNetworkInfo(wallet)`                | Wait for Cardano network info to be available             |
| `signCardanoTx(wallet, props)`              | Sign a Cardano transaction with an in-memory wallet       |
| `submitCardanoTx(wallet, props)`            | Submit a signed Cardano transaction to the network        |

### Types

| Type                              | Description                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `LaceWallet`                      | Wallet instance with `dispatch`, `getState`, `stateObservables`, `actionObservables` |
| `CreateLaceWalletProps`           | Options for `createLaceWallet`: `modules`, `environment`, `config`, `featureFlags`   |
| `CreateInMemoryWalletEntityProps` | Options: `mnemonicWords`, `password` (Uint8Array), `walletName`, `order?`            |
| `AppConfig`                       | Application configuration (Blockfrost, polling intervals, explorer URLs)             |
| `FeatureFlag`                     | Feature flag entry: `{ key: FeatureFlagKey, payload?: string }`                      |
| `SignCardanoTxProps`              | Options: `serializedTx`, `password?` (Uint8Array), `accountId?`                      |
| `CardanoSignResult`               | Signing result with witness set                                                      |
| `SubmitCardanoTxProps`            | Options: `serializedTx` (HexBytes)                                                   |

### Value Objects

Time utilities with nominal typing (zero runtime overhead):

```typescript
import {
  Milliseconds,
  Seconds,
  Minutes,
  Hours,
  Days,
  Timestamp,
  TimeSpan,
} from '@input-output-hk/lace-sdk';
```

Other value objects: `BigNumber`, `HexBytes`, `ByteArray`, `Uri`

### Feature Flags

| Flag                        | Purpose                                               |
| --------------------------- | ----------------------------------------------------- |
| `FEATURE_FLAG_CARDANO`      | Enable Cardano blockchain support                     |
| `FEATURE_FLAG_NETWORK_TYPE` | Set default network type (`'mainnet'` or `'testnet'`) |

## License

Apache-2.0
