# @laceio/sdk

A headless TypeScript SDK for self-custody wallets, reactive state observables, transaction building, signing and submission, and wallet modules on one engine. Build wallets with recovery phrases, user-controlled key material or passkeys. In a browser app, wallet keys stay in the user's browser. The hosted signer is a self-custody passkey wallet running in a separate browser window; your app receives only public keys and signatures. The documentation, the API reference and a Playground are on the developer site, <https://sdk.lace.io>.

## Installation

The SDK's npm name is `@laceio/sdk`, and its Cardano entry is `@laceio/sdk/cardano`. Its API is committed under the
[compatibility promise](https://sdk.lace.io/docs/releases/#the-compatibility-promise).

```bash
npm install @laceio/sdk
```

Releases are published to [npmjs](https://www.npmjs.com/package/@laceio/sdk) as `@laceio/sdk`, and
to GitHub Packages as `@input-output-hk/lace-sdk`, from the public
[`input-output-hk/lace-sdk`](https://github.com/input-output-hk/lace-sdk) repository. With a package from GitHub
Packages, import from `@input-output-hk/lace-sdk` and `@input-output-hk/lace-sdk/cardano` wherever the documentation
imports from `@laceio/sdk`. npm provenance links each version to its source commit and build, and
`npm audit signatures` verifies it. [Releases and compatibility](https://sdk.lace.io/docs/releases/) covers how each
release is checked.

Compile with `skipLibCheck: true`; [TypeScript setup](https://sdk.lace.io/docs/quickstart/#typescript-setup) says why.

## Quick Start

```typescript
import {
  Cardano,
  createLaceWallet,
  FEATURE_FLAG_CARDANO,
  FEATURE_FLAG_NETWORK_TYPE,
  m,
  Milliseconds,
} from '@laceio/sdk/cardano';

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
    extraFeatureFlags: [],
    defaultTestnetChainId: Cardano.ChainIds.Preprod,
    cardanoProvider: {
      tipPollFrequency: Milliseconds(30_000),
      blockfrostConfigs: {
        // Keyed by network magic: 1 is Preprod
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
      },
    },
    cexplorerUrls: { 1: 'https://preprod.cexplorer.io' },
  },
});

wallet.stateObservables.tokens.selectAllTokens$.subscribe(tokens => {
  console.log('Tokens:', tokens);
});
```

The [Quickstart](https://sdk.lace.io/docs/quickstart/) explains the `config`, adds a wallet and sends a first
transaction.

## Documentation

- [Quickstart](https://sdk.lace.io/docs/quickstart/): install, create a wallet, read state, send a transaction.
- Guides:
  - [Build, sign and submit a transaction](https://sdk.lace.io/docs/guides/transactions/)
  - [Add a passkey wallet to your app](https://sdk.lace.io/docs/guides/passkey-wallet/)
  - [Connect to the hosted signer](https://sdk.lace.io/docs/guides/hosted-signer/)
  - [Derive a wallet from your own key material](https://sdk.lace.io/docs/guides/own-key-material/)
- Learn:
  - [Supported blockchains](https://sdk.lace.io/docs/learn/blockchains/)
  - [Modules and contracts](https://sdk.lace.io/docs/learn/modules/)
  - [How a passkey becomes keys](https://sdk.lace.io/docs/learn/passkey-keys/)
  - [The hosted signer](https://sdk.lace.io/docs/learn/hosted-signer/)
- [API reference](https://sdk.lace.io/docs/reference/wallet/): every export, from the SDK's doc comments.
- [Releases and compatibility](https://sdk.lace.io/docs/releases/): the compatibility promise, verifying a release.
- For AI agents: [llms.txt](https://sdk.lace.io/llms.txt) and a Markdown twin of every page.

## License

Apache-2.0
