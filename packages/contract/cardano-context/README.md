# @lace-contract/cardano-context

This package includes:

- Cardano data provider types for `sideEffectDependencies` that can be implemented and provided by modules (e.g. @lace-module/cardano-provider-blockfrost).
- `sideEffects` implementation for loading Cardano data and dispatching other contract actions (e.g. `tokens`, `addresses`)
- Redux store slice for Cardano `tip` and active `chainId`
