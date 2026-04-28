# @lace-contract/network

This contract defines how the app models network type (mainnet/testnet),
blockchain-specific network identifiers, and the selection flow across modules.

## Concepts

- Network type: high-level environment toggle (`mainnet` or `testnet`) used across
  all supported blockchains.
- Blockchain network id: value object that encodes a chain-specific network
  selection (e.g., `cardano-preprod`, `bitcoin-testnet4`, `midnight-preview`).
- Default testnet id: the testnet network id used when a blockchain is on
  `testnet` and no user selection exists.

## Sources and precedence

Network type and default testnet ids can come from three places. When multiple
sources exist, the precedence is:

1. User settings (persisted state)
2. Feature flags
3. Build-time defaults

### Network type

- User settings: the selected network type persisted in the network slice.
  This always wins when present.
- Feature flag: `INITIAL_NETWORK_TYPE` provides the initial network type when
  there is no persisted value.
- Build-time defaults: module defaults used only when neither user settings nor
  feature flags provide a value.

### Default testnet ids

- User settings: the selected blockchain network id persisted in the network
  selection slice. When present, it overrides everything else for that
  blockchain.
- Feature flags: per-blockchain flags (for example `BLOCKCHAIN_CARDANO`) can
  seed the initial testnet id.
- Build-time defaults: per-blockchain defaults are used only when neither user
  settings nor feature flags provide a value.

## Flow overview

1. App boot loads persisted state for network type and selected network ids.
2. If a value is missing, the corresponding feature flag is applied.
3. If still missing, the build-time default is used.
4. When the user changes network type or a blockchain network id, the new
   value is persisted and takes precedence on the next boot.
