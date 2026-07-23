# @lace-lib/cnight-dust-designation

## Purpose

Deterministic, IO-free primitives for the **cNIGHT-on-Cardano DUST
designation** feature: a Cardano account holding cNIGHT can publish a
_designation_ that points DUST generation at a Midnight account's coin
public key. The on-chain mechanism is the `cnight_generates_dust`
Plutus V3 multi-purpose validator from
[midnightntwrk/midnight-reserve-contracts](https://github.com/midnightntwrk/midnight-reserve-contracts),
mirrored here verbatim.

Inputs go in, a deterministic blueprint comes out — no providers, no
network — so the package is usable from the service worker, mobile,
tests, or tooling.

## What It Provides

- **Script CBOR per network** (`scripts/{mainnet,testnet}.ts`) — pinned
  verbatim from `midnight-reserve-contracts`. The script hash drives the
  enterprise script address, the reward account, and the NFT policy id.
- **`DustMappingDatum` + `DustAction` encoders/decoders** (`plutus/`) —
  byte-identical to Blaze's `PlutusData` output.
- **Address / reward-account / NFT-asset-id derivations**
  (`plutus/script-address.ts`).
- **Value objects** (`value-objects/*.vo.ts`, per ADR 13):
  `CardanoDustNetwork`, `MidnightCoinPubkey`, `CardanoStakeKeyHash`,
  `CardanoPaymentKeyHash`, `DustMappingNftAssetId`.
- **Tx blueprint builder** (`builders/`) — the deterministic
  register / update / deregister primitives a tx-executor composes into a
  transaction.

## What It Deliberately Does NOT Provide

- **No IO.** No Blockfrost/provider calls, no network. The package stays
  deterministic so it runs in any context.
- **No balancing / completion.** Coin selection, fee, ex-units and
  balancing need providers + protocol params and are the tx-executor's
  job (`@lace-contract/cardano-context`'s `TransactionBuilder`). Keeping
  them out preserves the IO-free invariant and avoids a dependency cycle
  with `cardano-context`.

## Key Constraint: byte-equivalence

The Midnight indexer only recognises designation UTxOs whose datum +
address are byte-for-byte what the reference dApp produces. CBOR output
**must not change**. `test/plutus/cbor-byte-compare.test.ts` byte-checks
against a second canonical encoder and is the regression guard.

## Re-pinning the validator

When upstream ships a new validator (next protocol version, new cNIGHT
policy, etc.), re-pin `src/scripts/{mainnet,testnet}.ts` from
`midnight-reserve-contracts`'s `contract_blueprint_{mainnet,preview}.ts`.
The script hash, addresses, reward account, and NFT policy id all derive
from those bytes, so that one change propagates.

## Related

- [midnightntwrk/midnight-reserve-contracts](https://github.com/midnightntwrk/midnight-reserve-contracts)
  — Aiken validator + compiled CBOR per network (canonical source).
- [midnightntwrk/midnight-cnight-to-dust-dapp](https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp)
  — reference TypeScript front-end (second canonical encoder).
- The Redux flow (`nightDesignationFlow`) lives in
  `@lace-contract/cardano-context`; the confirm/submit side-effects in
  `@lace-module/blockchain-cardano`. This package is a dependency-free
  primitive both can build on.
- **ADR 13** — value-object / hierarchical-typing pattern used here.
