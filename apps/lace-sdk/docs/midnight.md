# Midnight in the Lace SDK

The `@laceio/sdk/midnight` entry runs Lace's Midnight wallet engine without a user interface. It syncs the
unshielded, shielded and DUST wallets of every in-memory Midnight account on the active network, persists their
state through the loaded storage module, and unlocks their keys with a password the application supplies instead
of an authentication prompt. On top of that engine it exposes the wallet operations:
deriving accounts, reading balances and history, building, signing, proving and submitting transactions, DUST
registration, message signing and the dApp connector's transaction primitives.

The entry exists in the canary build only, and its API may change between canary releases. The stable package
does not export `/midnight`. The main, `/cardano` and `/bitcoin` entries have no static Midnight dependency.

This guide lives in the repository, not in the published package: the package README documents the stable build.

## Install

Install the canary build and its optional Midnight peers:

```bash
npm install @laceio/sdk@canary
npm view @laceio/sdk@canary peerDependencies
```

Then install each package that `npm view` lists, at the version it lists:

- `@midnight-ntwrk/ledger-v8`
- `@midnightntwrk/wallet-sdk`
- `@midnightntwrk/wallet-sdk-abstractions`
- `@midnightntwrk/wallet-sdk-address-format`
- `@polkadot/api`, `@polkadot/api-base` and `@polkadot/util`
- `@subsquid/scale-codec`, which `@midnightntwrk/wallet-sdk-address-format` depends on

The peers are optional so that consumers of the other entries need not install them; the `/midnight` entry needs
all of them. The entry ships as ESM and CommonJS: in plain Node.js it loads through both `import` and
`require()`. Both builds load the ledger, `@polkadot/api`, `@polkadot/api-base`, `@polkadot/util` and
`@subsquid/scale-codec` from your install. They reach the wallet SDK packages differently: the ESM build imports
your installed copies, while the CommonJS build carries its own copy of the `@midnightntwrk/*` packages, which
publish import-only entry points that `require()` cannot load.
Your `@midnightntwrk/*` peers therefore serve the ESM build and the type declarations; the CommonJS build does not
load them. Its CommonJS build requires `@midnight-ntwrk/ledger-v8`, whose `node` export is an ES module, so
`require()` needs a Node.js release that loads ES modules through `require()` without a flag: 20.19 or later on
the 20 line, 22.12 or later otherwise. Compile with `skipLibCheck: true`, as for the rest of the SDK.

## Configure

```typescript
import {
  createInMemoryWalletEntity,
  createLaceWallet,
  createMidnightModule,
  FEATURE_FLAG_MIDNIGHT,
  FEATURE_FLAG_MIDNIGHT_UNSHIELDED,
  FEATURE_FLAG_NETWORK_TYPE,
  m,
  MidnightSDKNetworkIds,
} from '@laceio/sdk/midnight';

const password = new TextEncoder().encode('session-secret');
const featureFlags = [
  { key: FEATURE_FLAG_MIDNIGHT },
  { key: FEATURE_FLAG_MIDNIGHT_UNSHIELDED },
  { key: FEATURE_FLAG_NETWORK_TYPE, payload: 'testnet' },
];
const wallet = await createLaceWallet({
  modules: [
    m.featureDev,
    m.storageInMemory,
    createMidnightModule({
      password,
      // The default. A remote prover sees every transaction it proves.
      proofServerUrl: 'http://localhost:6300',
    }),
  ] as const,
  environment: 'development',
  featureFlags,
  config: {
    defaultFeatureFlags: featureFlags,
    extraFeatureFlags: [],
    defaultMidnightTestnetNetworkId: MidnightSDKNetworkIds.Preview,
  },
});

const entity = await createInMemoryWalletEntity(wallet, {
  mnemonicWords: words,
  password,
  walletName: 'Agent',
});
wallet.dispatch('wallets.addWallet', entity);
// Keep `password` intact while entity helpers still take it; zero it only after the last such call.
```

### Module options

`createMidnightModule({ password, proofServerUrl?, networks?, batchUpdates?, createAttestedProver? })`:

- **`password`** seals the derived account keys inside the wallet entity and unlocks them for sync and signing.
  Pass the same bytes to the entity helpers. The module copies the password once and keeps its copy for the
  wallet's lifetime. Zero your own buffer only after the last entity helper call that takes the same bytes
  (`createInMemoryWalletEntity`, `createMidnightAccounts`, `createMidnightPasskeyWalletEntity`), never right after
  `createMidnightModule`: an entity sealed under zeroed bytes cannot be unlocked with the module's copy.
- **`proofServerUrl`** is the proof server every network proves with unless `networks` names another;
  `MIDNIGHT_LOCAL_PROOF_SERVER_URL` (`http://localhost:6300`) by default. A URL on another host is a delegated
  prover, which sees every transaction it proves.
- **`networks`** overrides a network's `nodeAddress`, `indexerAddress` or `proofServer`, for example
  `{ preprod: { nodeAddress, indexerAddress } }`.
- **`batchUpdates`** sets how many synced events the engine applies per WASM chunk and the pause between chunks;
  `{ size: 12, spacing: 4 }` by default.
- **`createAttestedProver`** is the trusted host adapter for a TEE prover; see [Attested proving](#attested-proving).

The module's store init applies these on startup: the networks the loadout can sync, each network's default proof
server, then the endpoint overrides. A proof server the user selected afterwards takes precedence over the default.

### Feature flags and storage

- `FEATURE_FLAG_MIDNIGHT` loads the engine. `FEATURE_FLAG_MIDNIGHT_UNSHIELDED` publishes the unshielded address
  and balances to the `addresses` and `tokens` state. `FEATURE_FLAG_NETWORK_TYPE` selects testnet or mainnet.
- The engine persists its synced state, several megabytes per account, through the storage module in `modules`:
  `m.storageInMemory` keeps it for the process, `m.storageWebIndexeddb` keeps it across sessions in a browser.
- Every SDK loadout, not only Midnight's, carries the analytics store: it mints a random user id and persists it
  under the `analytics` key of that storage. The SDK's analytics provider reports nothing.

### Networks

`config.defaultMidnightTestnetNetworkId` is required, as `defaultTestnetChainId` is for Cardano: it names the
testnet the wallet starts on. The SDK does not check it against the endpoints it has, so name a network that has
them.

`preview`, `preprod`, `mainnet` and `qanet` sync through their public endpoints, listed in
`MIDNIGHT_PUBLIC_ENDPOINTS`, without `networks`. `undeployed`, `devnet` and `testnet` have no public endpoints:
supply `nodeAddress` and `indexerAddress` for them in `networks`.

`selectMidnightNetwork(wallet, networkId)` switches the active network at runtime. The engine stops the wallets
of the previous network and starts those of the new one. It throws `MidnightNetworkNotConfiguredError` for a
network without endpoints.

```typescript
import {
  createMidnightModule,
  MidnightSDKNetworkIds,
  selectMidnightNetwork,
} from '@laceio/sdk/midnight';

// A local node and indexer for a network without public endpoints.
const localModule = createMidnightModule({
  password,
  networks: {
    [MidnightSDKNetworkIds.Undeployed]: {
      nodeAddress: 'http://localhost:9944',
      indexerAddress: 'http://localhost:8088/api/v4/graphql',
    },
  },
});

selectMidnightNetwork(wallet, MidnightSDKNetworkIds.PreProd);
```

### Attested proving

To prove in a trusted execution environment, select a `tee-delegated` proof server for the network and supply
`createAttestedProver`. The callback receives `{ networkId, proofServerApiUrl, getLedgerIndexerUrl }` and returns an
`AttestedProverProvider`; `getLedgerIndexerUrl` reads the Preprod indexer of the module's network configuration on
each run, because the attestation ledger is on Preprod for every network. The callback is trusted host code: it
must validate the evidence and policy and bind the channel before it returns a session.

`createTemenosAttestedProver({ ...props, trustRoots, verifier })` is the adapter for the Temenos prover. It
accepts only its supported network and deployment configuration.

```typescript
import {
  createMidnightModule,
  createTemenosAttestedProver,
} from '@laceio/sdk/midnight';
import type { TemenosTrustRoots, TemenosVerifier } from '@laceio/sdk/midnight';

const attestedModule = (
  password: Uint8Array,
  trustRoots: TemenosTrustRoots,
  verifier: TemenosVerifier,
) =>
  createMidnightModule({
    password,
    networks: {
      preview: {
        proofServer: {
          kind: 'tee-delegated',
          url: 'https://api.proofserver.preview.wastedp.io',
          label: 'Temenos',
        },
      },
    },
    createAttestedProver: props =>
      createTemenosAttestedProver({ ...props, trustRoots, verifier }),
  });
```

The Temenos adapter needs host access to the private `@input-output-hk/temenos-attestation-verifier@0.3.0`
package, which the SDK neither installs nor imports. Supply in `verifier` its `LocalCheckFailedError` and
`AttestationVerificationError` classes, and `createVerifier(config)` returning a **new** `AttestationVerifier` on
each call, built from that same config: `AkxEvidenceProvider.fromConfig(config)`,
`RealLedgerClient.fromConfig(config)`, `new RealLocalVerifier()`, `RealWardenClient.fromConfig(config)` and
`AkxChannelBinder.fromConfig(config)`, under the `evidenceProvider`, `ledgerClient`, `localVerifier`,
`wardenClient` and `channelBinder` keys. Supply reviewed AMD root certificates as `trustRoots`; never derive them
from a prover's responses, and do not cache the verifier or the session.

A generic `createAttestedProver` works without the private package. Ordinary `/midnight` imports need neither
that package nor browser globals.

The rules the engine enforces:

- A `tee-delegated` proof server without an adapter is refused.
- A recognised TEE host configured as an ordinary HTTP prover is refused, even when an adapter exists.
- An attestation failure never falls back to HTTP.
- Temenos supports `prove`; its attested channel does not support `check`, which rejects.
- In-process and paired-device proving are not supported.

## Wallets and accounts

`createInMemoryWalletEntity(wallet, { mnemonicWords, password, walletName })` derives index `0` of a recovery
phrase. Sealing three keys for each of the seven Midnight networks is CPU-bound and takes tens of seconds: run it
off any UI thread and show progress. Dispatch `wallets.addWallet` with the result to start syncing it.

`createMidnightAccounts` appends another derivation index, using the encrypted material in the entity. It returns
the updated entity without dispatching and preserves the entity's accounts on other chains. The same recovery
phrase, index and network restore the same keys and addresses.

```typescript
import {
  createMidnightAccounts,
  MidnightNetworkId,
  MidnightSDKNetworkIds,
} from '@laceio/sdk/midnight';

const updated = await createMidnightAccounts(wallet, {
  wallet: entity,
  password,
  accountIndex: 7,
  accountName: 'Restored account',
  targetNetworks: new Set([MidnightNetworkId(MidnightSDKNetworkIds.Preview)]),
});
// For an entity already added:
wallet.dispatch('wallets.updateWallet', {
  id: updated.walletId,
  changes: {
    accounts: updated.accounts,
    blockchainSpecific: updated.blockchainSpecific,
  },
});
```

- Indexes are integers in `[0, 2³¹)`. A duplicate account ID, an entity with neither a Midnight seed nor a
  recovery phrase (a passkey entity), a missing Midnight integration or a failed decryption or derivation rejects
  the promise.
- For a new entity, append the indexes first and dispatch `wallets.addWallet` once with the final entity.
- Without `targetNetworks`, accounts are derived for all seven networks.
- Account IDs include their network. Operations need an explicit `accountId` when several Midnight accounts are on
  the active network.
- Midnight does not support passwordless lazy entities.

`createMidnightPasskeyWalletEntity(wallet, { keySource, password, walletName, accounts? })` derives the Midnight
accounts of a passkey's words within one assertion: account 0 on every network, and the indexes `accounts` lists, in
the form `createMidnightAccounts` takes. Unlike the Cardano passkey entity, the result is an `InMemory` entity whose
account keys are sealed under `password`, because the engine needs them while it syncs. It holds no recovery phrase,
no seed and no account of another blockchain, so `createMidnightAccounts` refuses it: list every index in
`accounts`. To add one later, derive the entity again with it in `accounts` and dispatch `wallets.updateWallet` with
its `accounts`, since `wallets.addWallet` ignores an entity whose wallet ID it already holds. The sealed keys open with `password` alone, so use a random
per-session secret, keep the entity out of persistent storage and follow the safe startup order of the passkey
Cardano wallet. The passkey Cardano entity and this one share the passkey's wallet ID, and `wallets.addWallet` keeps
the first entity with an ID, so one wallet instance holds only one of them.

Each `createLaceWallet` instance owns its Midnight engines and providers, even when another instance holds the same
account IDs. Operations resolve only within the wallet they are given, and stopping, restarting or switching the
network of one instance leaves the others' engines running. A stopped account must start again before operations
can use it.

## Read state

### Balances

`observeMidnightBalances(wallet, { accountId? })` emits the account's unshielded NIGHT and generated DUST from the
moment the engine starts its wallets, and whether each sub-wallet has caught up with the chain. The observable is
cold: it resolves the account when subscribed, and errors that subscriber when no Midnight account matches. It
follows the engine's current wallet for the account across a sync reset or restart: while the engine has no wallet
for the account (the reset gap, a failed restart, a removed account) it re-emits the last balances with every
`synced` flag false, and it errors with `MidnightWalletNotReadyError` if no wallet returns within `startTimeout`.
NIGHT is summed from the engine state the stream observes; DUST reuses the engine's derivation. The unshielded
wallet syncs in seconds. The shielded and DUST wallets replay the chain through WASM and take minutes on a fresh
account. A transfer needs both the unshielded and the DUST wallet synced.

```typescript
import { filter, firstValueFrom } from 'rxjs';
import { observeMidnightBalances } from '@laceio/sdk/midnight';

const balances = await firstValueFrom(
  observeMidnightBalances(wallet).pipe(
    filter(({ synced }) => synced.unshielded && synced.dust),
  ),
);
console.log(
  balances.address.unshielded,
  balances.night.available,
  balances.dust.available,
);
```

### Observables

The wallet's `stateObservables` carry the wallet state. A parameterised selector emits a
function: subscribe, then call each emitted function with the account argument, and keep object and array
arguments stable between emissions. A missing entry means no state has been observed yet, not a zero balance.

```typescript
import { map } from 'rxjs';

const accountIds = [accountId];
const subscription =
  wallet.stateObservables.midnightContext.selectDustGenerationDetails$
    .pipe(map(select => select(accountIds)))
    .subscribe(details => console.log(details[accountId]));
// When the consuming view or process stops:
subscription.unsubscribe();
```

In the table, `select(...)` is the function the observable emits.

| Observable                                                             | Emits                                                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addresses.selectByAccountId$` → `select(accountId)`                   | Shielded, unshielded and DUST receive addresses; unshielded needs its feature flag.                                                               |
| `midnightContext.selectPublicKeysByAccountId$` → `select(accountId)`   | Public `coin` and `encryption` keys as hex; the connector's getters encode the same bytes for the network.                                        |
| `tokens.selectAggregatedTokensByAccountId$` → `select(accountId)`      | Shielded and unshielded tokens with `available` and `pending` balances in the smallest unit; `metadata.blockchainSpecific.kind` tells them apart. |
| `midnightContext.selectDustBalanceByAccount$`                          | Generated DUST per account, including coins held by pending transactions.                                                                         |
| `midnightContext.selectDustAvailableByAccount$`                        | Spendable DUST per account; it can be zero while generated DUST is not.                                                                           |
| `midnightContext.selectDustGenerationDetails$` → `select([accountId])` | `currentValue`, `maxCap` and `rate` as bigint, optional `decayTime` and `maxCapReachedAt` in epoch milliseconds; undefined without generation.    |
| `sync.selectSyncStatusByAccount$`                                      | Pending operations and the last successful and failed sync times per account.                                                                     |
| `activities.selectByAccountId$` → `select({ accountId })`              | History rows: sends, receives, self transfers and failures.                                                                                       |
| `activities.selectActivityDetails$`                                    | The last requested detail, with address, timestamp and fee; undefined when none matches.                                                          |

Request a row's detail with `wallet.dispatch('activities.loadActivityDetails', { blockchainName: 'Midnight',
activity })`.

### Sync and resync

Sync is complete when every enabled sub-wallet has completed. A progress value that rounds to `1` is not
completion, and a cached `lastSuccessfulSync` is not current completion. The engine retries a dropped connection
itself and may keep cached progress meanwhile; the sync store has no separate connectivity flag. Exhausted startup
or runtime retries produce a failed operation.

To resync one account from scratch:

```typescript
wallet.dispatch('midnightContext.resetSyncState', { accountId });
```

The dispatch returns before the reset completes. The engine stops the account's persistence, deletes only its
stored engine state, clears its derived addresses, tokens, activities and DUST and sync caches, and restarts it;
other accounts keep syncing. Observe `sync.selectSyncStatusByAccount$` for the outcome. A failed stop or storage
wipe leaves the reset failed and the caches in place, and a later reset can retry. A new reset can rescue a stop
that hangs; once the storage wipe starts, further resets of that account are ignored until it settles.
`midnightSync.requestResync` resyncs the whole chain.

### Token display names

`isTokenFullNameValid`, `isTokenShortNameValid`, `isForbiddenTokenName` and `isTakenTokenName` validate a display
name and ticker. Trim the input first, and leave the token's current name and ticker out of the taken-name list so
the user can keep them. NIGHT, DUST and other reserved tokens are not editable.

To save, read the token's metadata from `tokens.selectTokensMetadata$`, keep its other fields, and dispatch
`tokens.upsertTokenMetadata` with `{ ...metadata, tokenId, name: name.trim(), ticker: ticker.trim() }`. The action
does not validate, so validate before dispatching. Sync keeps the display names when it refreshes the token.

## Send

Every operation that signs, proves or submits acts on the account it is given; the SDK shows no prompt. Obtain the
user's consent for the exact account, network, recipients, amounts and prover disclosure before building, and
authorise submission separately. A change of inputs or network needs a new preparation and new consent.

### Unshielded NIGHT

A transfer is built, signed, proved and submitted in four steps. Each resolves with a `Result` and never rejects.

```typescript
import {
  buildMidnightTransfer,
  proveMidnightTx,
  signMidnightTx,
  submitMidnightTx,
} from '@laceio/sdk/midnight';

// Obtain consent for this transaction, account and prover disclosure first,
// on an estimateMidnightFee review: building reserves the inputs.
const recipe = (
  await buildMidnightTransfer(wallet, {
    to: 'mn_addr_preview1...',
    amount: 1_000_000n,
  })
).unwrap();
const signed = (await signMidnightTx(wallet, { recipe })).unwrap();
// Proving runs on the module's proof server, which sees the whole
// transaction. It takes minutes on a laptop.
const transaction = (
  await proveMidnightTx(wallet, { recipe: signed })
).unwrap();
// Submission needs its own authorisation.
const { txId } = (await submitMidnightTx(wallet, { transaction })).unwrap();
```

### Releasing a recipe

Building reserves the coins a recipe spends, and the engine persists the reservation: until the transaction is
submitted they are missing from `night.available`, and later builds cannot select them. Show the user the
`estimateMidnightFee` review, which reserves nothing, and build only after consent.

Release a recipe with `discardMidnightTx(wallet, { accountId, recipe })`, under the account that built it, only if
it never reached proving: the user withdrew consent, `signMidnightTx` failed, or `proveMidnightTx` returned
`MidnightAccountNotFoundError`, `MidnightWalletNotReadyError` or a `RangeError` for its `proveTimeout`, all raised
before proving starts. Do not discard after any other `proveMidnightTx` error, including a timeout: the engine
releases a recipe whose proving fails, and a timed-out proof keeps running and ends either way. Do not discard a
proved transaction you decide not to submit; the engine releases it once its validity window (`ttl`, one hour by
default) has passed without it reaching the chain.

The release works per coin, not per transaction. Discarding a recipe the engine has already released, or one built
before a sync reset (`resetSyncState`) cleared its reservation, can free coins that a later build reserved for a
transaction still in flight; for the same reason a recipe whose transaction was passed to `submitMidnightTx` must
never be discarded, and under another account the release finds nothing and still reports `Ok`.

`registerMidnightDust` reserves the NIGHT it registers in the same way. If it cannot build the registration, it
releases that NIGHT itself; if that release also fails, it returns an `AggregateError` holding both failures, and
the NIGHT stays reserved until a sync reset. The wallet library does not release it when the fee query of a first
registration fails; it then also stays reserved until a sync reset.

### Batches

`buildMidnightTransfers(wallet, { kind, outputs, accountId?, ttl? })` builds a shielded or an unshielded batch.
Each output is `{ to, tokenId, amount }`: `amount` is a positive bigint in the token's smallest unit, and
`tokenId` is the identifier from token state (raw 64-character hex for shielded tokens, prefixed with
`unshielded-<network>` for unshielded ones). The helper keeps every recipient and token, refuses an empty batch or
one that mixes kinds, and checks each destination's kind and network. The engine refuses a batch the account
cannot fund in tokens or fee DUST. `buildMidnightTransfer` is the single-output NIGHT shortcut.

### Fees

`estimateMidnightFee(wallet, request)` returns `Result<{ dustFee, availableDust }, Error>` without balancing or
signing, so it can run before consent. Pass `{ kind: 'transfer', transfer: batch }` for a batch, or
`{ kind: 'dust-registration', registration: { accountId?, dustAddress? } }` for a registration. The estimate is a
figure to show before consent, not the fee the engine will charge: a first registration with no spendable DUST
estimates zero, the special case the estimate reserves for it, while the engine still checks that the coins'
generated DUST covers its fee and refuses the registration when it does not; a repeat registration (some NIGHT already registered)
is priced from the ledger's fee rules for a registration that spends every NIGHT coin separately, so with several
coins it is above what the engine, which combines them, charges; a first registration that does have spendable DUST
is priced with the whole NIGHT value as its fee allowance, which can be below what the engine charges. A mixed set
of registered and unregistered coins can be refused by the engine's generated-DUST check even when spendable DUST is
plentiful. Otherwise the engine estimates with the available keys. `Insufficient spendable DUST` means the estimate
exceeds the DUST available now, not that the engine's fee does: with several registered coins the engine's fee can be
lower and the build can still balance. Treat it as a signal to wait for DUST to generate or register more NIGHT
before building, or to build and let the build decide: state and time change the final fee, a successful estimate
does not guarantee that the build balances, and the build releases what it reserved when the fee cannot be paid.

### DUST registration

Fees are paid in DUST, which registered NIGHT generates. `registerMidnightDust(wallet, { dustAddress? })` builds the
registration of every available NIGHT UTXO. **It signs internally: obtain the user's confirmation before calling
it.** An explicit `dustAddress` must be a DUST address on the account's network, and the account must hold NIGHT;
with an explicit `dustAddress` the account must not already be designated (no registered NIGHT, generated DUST or
generation capacity), and such a re-designation is refused before signing. A registration takes no `ttl`: the engine sets its validity window to one hour, and a supplied `ttl`
is refused. Without `dustAddress` the account registers to its own DUST address, which also covers a repeat
registration; NIGHT already registered to an external DUST address is then re-registered to the account's own
address. Prove and submit the returned recipe as above.

### Message signing

`signMidnightData(wallet, { accountId?, data, options })` signs a message with the account's unshielded NIGHT key,
the only key type supported, and returns `Result<Signature, Error>`.

```ts
import { signMidnightData } from '@laceio/sdk/midnight';

// Call only after the user has consented to this payload and account.
const result = await signMidnightData(wallet, {
  accountId,
  data: 'Hello Midnight',
  options: { encoding: 'text', keyType: 'unshielded' },
});
if (result.isOk()) {
  const { data, signature, verifyingKey } = result.value;
}
```

The decoded bytes are prefixed with `midnight_signed_message:<byteLength>:` before signing, including for an empty
message; a verifier rebuilds this envelope from the decoded byte length, not the text's character count. Text is
decoded as UTF-8. Hex and base64 keep the connector's permissive decoding: malformed hex is truncated and invalid
base64 characters are ignored. The returned `data` is the original payload, and `verifyingKey` is the account's
unshielded key.

## dApp connector primitives

These helpers give an application the same transaction operations the Lace dApp connector offers.

- `balanceMidnightSealedTransaction(wallet, { tx, options? })` and
  `balanceMidnightUnsealedTransaction(wallet, { tx, options? })` decode a hex ledger transaction, with binding and
  pre-binding respectively, then balance, sign and prove it. `options: { payFees: false }` leaves DUST out of
  balancing.
- `makeMidnightTransfer(wallet, { desiredOutputs, options? })` builds mixed shielded and unshielded outputs.
- `makeMidnightIntent(wallet, { desiredInputs, desiredOutputs, options: { intentId, payFees } })` aggregates inputs
  by kind and token. `intentId` accepts a number or `'random'` but is ignored, as in the connector. Every output
  kind needs an input of the same kind: the wallet library builds a kind's leg from its inputs and drops the outputs
  of a kind without any, so an intent that offers only unshielded tokens and asks for shielded ones (or the reverse)
  is refused before anything is reserved or signed.

They take the connector's `DesiredInput` and `DesiredOutput` types: raw ledger token hex in `type`, a bigint
`value`, and a Bech32m `recipient` matching the output's network and kind. These token identifiers differ from the
token-state IDs `buildMidnightTransfers` takes. All four accept `accountId`, `startTimeout` and `proveTimeout`, keep the
connector's transaction TTL, return `Result<MidnightFinalizedTx, Error>` and never submit. A transfer signs when it
has unshielded outputs; an intent signs when it has unshielded inputs or outputs. Pass the result to
`submitMidnightTx` once submission is authorised.

`getMidnightProvingProvider(wallet, { keyMaterialProvider, accountId?, startTimeout?, proveTimeout? })` returns
`Result<ProvingProvider, Error>` whose `check(preimage, keyLocation)` and
`prove(preimage, keyLocation, overwriteBindingInput?)` use the captured account's current prover and reject on
failure. Each call re-resolves that account, so it never uses a stopped engine or another account or network. The
provider exposes no prover URL or wallet key. `KeyMaterialProvider` supplies the circuit's prover and verifier keys
and ZKIR. When its lookup fails for a protocol circuit (a `midnight/`-prefixed key location), the built-in circuits
are used; any other error from the provider reaches the caller. Obtain consent to disclose the preimage and
circuit material to the configured prover before calling `check` or `prove`.

### Submission and confirmation

`submitMidnightTx` resolves when the node reports the transaction final, because the engine submits at its
`Finalized` stage: `Ok` means the transaction is on chain, and its `txId` is the engine's identifier, not the activity
hash (`transaction.transactionHash()`). The SDK records a Pending activity under the activity hash as soon as it hands
the transaction to the engine, before finality; the engine reports no earlier acceptance. The history sync replaces
that row with the confirmed one. `submitTimeout` (5 minutes by default) bounds the wait for finality, not for
broadcast, so an `Err` does not prove that nothing reached the chain. A `MidnightSubmitTimeoutError` (`code`
`midnight-submit-timeout`) carries the `activityHash` and leaves the Pending row in place; the transaction may still
land. The SDK keeps listening to the engine's submission after the timeout, for as long as that submission runs in
this process: a failure it reports later removes the row, and a confirmation reaches the history sync. A row whose
outcome this process never learns (it ends first) stays until the history sync confirms it or you remove it. The
account-resolution errors (`MidnightAccountNotFoundError`, `MidnightWalletNotReadyError`) precede the call, so nothing
was broadcast and no row exists; any other error is the engine's: the engine releases the transaction's coins and the
SDK removes its Pending row, yet the error may also arrive after broadcast. Before retrying, look for the activity hash in the account's activities. Tracking is best effort and never
turns a successful submission into a failure: the coin read behind the Pending row is bounded on its own and a wallet
whose state does not settle in time is submitted without a row.

### Proving progress and timeouts

`proveMidnightTx(wallet, { recipe, accountId?, onProgress?, proveTimeout? })` passes the
`AttestationProgressEvent` values of that proof's provider to `onProgress`. The events name phases and checks, not
percentages, and an ordinary HTTP prover may emit none. Concurrent proofs have separate observers, and the
callback is detached when the proof settles or times out.

Every helper that proves takes `proveTimeout` in milliseconds, with one default shared by all of them:
`proveMidnightTx`, `balanceMidnightSealedTransaction`, `balanceMidnightUnsealedTransaction`,
`makeMidnightTransfer`, `makeMidnightIntent` and `getMidnightProvingProvider`. The default is 10 minutes and the
maximum is 2^31 - 1 ms (about 24.8 days), the longest delay a timer honours; any other value, including `Infinity`,
is refused with a `RangeError` returned as an `Err`. The same range applies to `submitTimeout` and to every
helper's `startTimeout`. A timeout stops the helper waiting; it does not cancel the proving work. For `getMidnightProvingProvider` the timeout applies to each `check` or `prove` call and also covers
the `KeyMaterialProvider` lookup, so a slow key server can make that call time out.

## Errors

Operations return `Result<T, Error>` and do not reject. `createMidnightModule` and `selectMidnightNetwork` can
throw, entity creation can reject, `observeMidnightBalances` can error, and the proving provider's methods reject.

The SDK's own errors carry a `code` of type `MidnightErrorCode`:

| Error                               | `code`                            | Cause                                                                 |
| ----------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| `MidnightNetworkNotConfiguredError` | `midnight-network-not-configured` | The network has no public endpoints and none in `networks`.           |
| `MidnightAccountNotFoundError`      | `midnight-account-not-found`      | No single in-memory Midnight account on the active network matches.   |
| `MidnightWalletNotReadyError`       | `midnight-wallet-not-ready`       | The engine did not start the account's wallets within `startTimeout`. |
| `MidnightNothingToRegisterError`    | `midnight-nothing-to-register`    | The account has no available NIGHT to register for DUST generation.   |
| `MidnightSubmitTimeoutError`        | `midnight-submit-timeout`         | The node did not report finality within `submitTimeout`; may land.    |

The engine's own failures, such as insufficient tokens or DUST, decoding, validation, signing and proving errors,
arrive as ordinary `Error` values with the engine's message.

## Limits

- **Canary API.** The `/midnight` entry may change in any canary release. It graduates under the compatibility
  promise only through a reviewed change to the stable build.
- **Transfers.** `buildMidnightTransfers` builds batches of one kind; mixed shielded and unshielded outputs go
  through `makeMidnightTransfer`.
- **History.** Shielded-only transactions are not listed in the history, so the history is not a complete shielded
  record.
- **Reservations.** Building reserves the coins each step spends: the tokens, then the DUST fee. When a later step
  fails, the coins the earlier steps reserved are released and the step's error is returned, for transfers, batches
  and the connector primitives alike, so a failed build never holds coins you cannot discard. If a transfer's or
  an intent's release fails as well, the error is an `AggregateError` of both failures; a release that fails elsewhere leaves
  the coins reserved until a sync reset (`resetSyncState`) clears the unshielded ones. DUST registration releases
  its NIGHT when it finds too little DUST for its fee, but not when the fee query of a first registration fails,
  which the wallet library does not handle: that NIGHT stays reserved until a sync reset. Check
  `estimateMidnightFee` first to avoid building what cannot be paid.
- **Pre-binding balancing.** `balanceMidnightUnsealedTransaction` adds the wallet's unshielded inputs to the dApp's
  transaction without reserving them, as the wallet library does: until the wallet syncs that transaction from the
  chain, another build can select the same NIGHT, and the later submission fails.
- **Proving time.** Proving takes minutes on a laptop and depends on the prover. A `proveTimeout` stops waiting but
  does not cancel the proof on the prover, and stopping a wallet does not cancel a proof in flight. A proof that
  times out has an unknown outcome.
- **Startup.** Deriving an entity is CPU-bound and takes tens of seconds, and a fresh account's shielded and DUST
  wallets take minutes to sync; keep both off any UI thread and show progress.
- **Provers.** A delegated prover, attested or not, receives every transaction and circuit it proves. In-process and
  paired-device proving are not supported.

## Functions

| Function                                            | Does                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `createMidnightModule(props)`                       | The Midnight engine module, unlocked by a password                      |
| `createMidnightAccounts(wallet, props)`             | Append a restored account index without dispatching                     |
| `createMidnightPasskeyWalletEntity(wallet, props)`  | Derive a Midnight wallet entity from a passkey within one assertion     |
| `selectMidnightNetwork(wallet, networkId)`          | Make a Midnight network with endpoints the active one                   |
| `observeMidnightBalances(wallet, props?)`           | Observe unshielded NIGHT, DUST and sync state from the engine           |
| `buildMidnightTransfer(wallet, props)`              | Build an unshielded NIGHT transfer recipe                               |
| `buildMidnightTransfers(wallet, props)`             | Build a shielded or unshielded batch                                    |
| `estimateMidnightFee(wallet, request)`              | Estimate the DUST fee without signing                                   |
| `registerMidnightDust(wallet, props?)`              | Build the registration of available NIGHT for DUST generation           |
| `signMidnightData(wallet, props)`                   | Sign a domain-separated message with the unshielded key                 |
| `signMidnightTx(wallet, props)`                     | Sign a recipe's unshielded inputs                                       |
| `discardMidnightTx(wallet, props)`                  | Release the coins a recipe that will not be submitted reserves          |
| `proveMidnightTx(wallet, props)`                    | Prove a signed recipe through the configured proof server               |
| `submitMidnightTx(wallet, props)`                   | Submit a proved transaction                                             |
| `getMidnightProvingProvider(wallet, props)`         | Account-bound circuit `check` and `prove` through the configured prover |
| `createTemenosAttestedProver(props)`                | Temenos adapter with a host-supplied verifier and trust roots           |
| `balanceMidnightSealedTransaction(wallet, props)`   | Balance, sign and prove a binding connector transaction                 |
| `balanceMidnightUnsealedTransaction(wallet, props)` | Balance, sign and prove a pre-binding connector transaction             |
| `makeMidnightTransfer(wallet, props)`               | Build, sign and prove mixed-kind connector transfers                    |
| `makeMidnightIntent(wallet, props)`                 | Build, sign and prove connector intents                                 |

`MidnightAccountSelection` (`accountId?`, `startTimeout?`) is the account selection the operations take.
`MidnightAccountProps` describes an account's blockchain metadata, including its network.
