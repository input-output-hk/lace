# @lace-module/dapp-connector-cardano

Cardano dApp connector module for Lace wallet, implementing CIP-30 API.

## Overview

This module provides Cardano dApp connectivity for both extension and mobile platforms:

- **Extension**: Injects `window.cardano.lace` following CIP-30 standard
- **Mobile**: WalletConnect integration (planned)

## CIP-30 API

Implements the [CIP-30](https://cips.cardano.org/cip/CIP-30) standard:

### Initial API (before `enable()`)

- `isEnabled()` - Check if dApp is already authorized
- `enable(extensions?)` - Request access to the wallet

### Full API (after `enable()`)

- `getNetworkId()` - Get current network ID (0 = testnet, 1 = mainnet)
- `getUtxos(amount?, paginate?)` - Get wallet UTXOs
- `getBalance()` - Get wallet balance (CBOR-encoded Value)
- `getUsedAddresses(paginate?)` - Get used addresses
- `getUnusedAddresses()` - Get unused addresses
- `getChangeAddress()` - Get change address
- `getRewardAddresses()` - Get reward/stake addresses

## Architecture

```
src/
├── index.ts                 # Module entry point
├── augmentations.ts         # Type augmentations
├── const.ts                 # Constants and feature flags
├── types.ts                 # CIP-30 type definitions
├── messaging.ts             # Channel names
├── api-error.ts             # CIP-30 error classes
├── dapp-connector-api.ts    # Extension injection logic
│
├── store/
│   ├── index.ts             # Store context
│   ├── init.ts              # Store initialization
│   ├── slice.ts             # Redux slice
│   ├── side-effects.ts      # RxJS side effects
│   ├── dapp-connector-util.ts
│   └── dependencies/
│       ├── index.ts
│       ├── create-confirmation-callback.ts
│       └── dapp-connector.ts
│
└── render/
    ├── index.tsx            # Render routes
    ├── hooks.ts             # React hooks
    ├── sign-cardano-transaction.tsx
    ├── sign-cardano-data.tsx
    └── components/
        ├── sign-transaction.tsx
        └── sign-data.tsx
```

## Feature Flag

Enable the module with feature flag:

```
BLOCKCHAIN_CARDANO_DAPP_CONNECTOR
```

## dApp Usage

```javascript
// Check if Lace is available
if (window.cardano?.lace) {
  // Enable connection
  const api = await window.cardano.lace.enable();

  // Get wallet info
  const networkId = await api.getNetworkId();
  const balance = await api.getBalance();
  const addresses = await api.getUsedAddresses();
}
```
