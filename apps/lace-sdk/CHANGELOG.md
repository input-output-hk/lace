## 0.1.0-dev.6

### Breaking Changes

- **Single entrypoint** — The `@input-output-hk/lace-sdk/modules` subpath export is removed. Import modules via the `m` namespace from the main entrypoint instead: `import { m } from '@input-output-hk/lace-sdk'`.

### New Features

- **Transaction signing** — New `signCardanoTx(wallet, { serializedTx, password, accountId? })` signs a Cardano transaction using an in-memory wallet without requiring the authentication prompt UI. Account resolution is automatic when a single Cardano in-memory account exists on the active network; `accountId` disambiguates when multiple exist.
- **Transaction submission** — New `submitCardanoTx(wallet, { serializedTx })` submits a signed Cardano transaction to the network. Returns the transaction ID on success.

### Fixes

- **Bundled type definitions** — SDK now ships a self-contained `dist/index.d.ts` with full type inference. Previously, type definitions referenced unpublished `@lace-*` packages, resulting in `any` types and broken TypeScript inference for consumers.

### Internal

- Removed `react-native` and `expo-local-authentication` coupling from contract packages, replaced with injected `Runtime.platform` and `LocalAuthenticationDependency`

## 0.1.0-dev.5

### Breaking Changes

- **`@lace-lib/web3auth` removed, replaced by `@lace-lib/crypto`** — The SDK no longer wraps Web3Auth. Removed: `createWebWeb3AuthProvider`, `deriveMnemonicFromKeyMaterial`, `Web3AuthProvider`, `Web3AuthKeyMaterial`, `Web3AuthResult`. Consumers now call Web3Auth directly and pass the resulting private key as `EntropyHex` to `Mnemonic.deriveFrom()`.
- **HKDF salt changed from `'lace-web3auth'` to `'lace'`** — `Mnemonic.deriveFrom` produces a different mnemonic than the old `deriveMnemonicFromKeyMaterial` for the same input. Wallets derived with previous SDK versions are not recoverable with the new derivation.

### New Features

- **Transaction building** — New `createTxBuilder(wallet)` and `waitForNetworkInfo(wallet)` exports. `createTxBuilder` returns `Result<TransactionBuilder, Error>`. Call `waitForNetworkInfo` first to ensure chain ID and protocol parameters are available.

### Other

- **Web3Auth peer dependencies removed** — The SDK no longer declares `@web3auth/modal`, `@web3auth/base`, or `@web3auth/base-provider` as peer dependencies. If you already depend on them directly (as most Web3Auth consumers do), no action needed.

### Internal

- Build-time guard against React/Expo/webextension-polyfill leaking into the SDK bundle
- Postinstall check for non-hoisted dependencies moved to monorepo root (no longer ships to consumers)
- `redux-observable` version aligned with monorepo root
