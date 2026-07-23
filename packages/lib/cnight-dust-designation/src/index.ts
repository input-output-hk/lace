// =====================================================================
// @lace-lib/cnight-dust-designation — cNIGHT-on-Cardano DUST
// designation primitives.
// =====================================================================
// Deterministic, IO-free primitives that let a Cardano account holding
// cNIGHT register / update / deregister a designation pointing DUST
// generation to a Midnight account's coin public key. The on-chain
// mechanism is the `cnight_generates_dust` Plutus V3 multi-purpose
// validator from the midnight-reserve-contracts repo, mirrored here
// verbatim. Inputs go in, an `Ok({ cbor, ... })` comes out — no
// providers, no network, so it is usable from any context (service
// worker, mobile, tests, tooling).
//
// Upstream (the validator repo is the canonical source of truth for
// the Aiken validator, the compiled CBOR per network, the cNIGHT
// policy ids, and the on-chain schema; the reference dApp is one
// available consumer / second canonical encoder):
//   - Validator (Aiken):
//     https://github.com/midnightntwrk/midnight-reserve-contracts
//     • validators/cnight_generates_dust.ak (Aiken source)
//     • contract_blueprint_{mainnet,preview,preprod}.ts (compiled CBOR)
//     • aiken.toml (cnight_policy.bytes per network)
//   - Reference dApp (TypeScript front-end):
//     https://github.com/midnightntwrk/midnight-cnight-to-dust-dapp
//
// What this package ships:
//
//   - Script CBORs per network (verbatim)
//   - DustMappingDatum + DustAction encoding (cardano-sdk
//     `Serialization.PlutusData` — byte-identical to Blaze's output)
//   - Script address + reward account derivation
//   - DUST-mapping NFT asset id derivation
//   - cNIGHT asset id constants per network
//   - Validated "tx blueprint" + assembly that supply every field
//     needed to compose a `Serialization.Transaction` for the action
//
// What it deliberately does NOT ship: the final balancing/completion
// step. Balancing needs a coin selector + protocol params and is the
// tx-executor's job (`@lace-contract/cardano-context`'s
// `balanceTransaction`); keeping it out preserves this package's
// IO-free, dependency-light invariant and avoids a cycle with
// cardano-context. Callers assemble the blueprint here, then balance
// + sign + submit through their own executor.
//
// Byte-equivalence with the reference dApp is the load-bearing
// contract; `test/plutus/cbor-byte-compare.test.ts` is the regression
// guard. Re-pin `src/scripts/{mainnet,testnet}.ts` from
// midnight-reserve-contracts when the validator changes; the hash +
// address derivations propagate.
// =====================================================================

export { LOVELACE_FOR_REGISTRATION } from './constants';
export { Err, Ok, type NightDesignationError, type Result } from './errors';

export {
  TESTNET_CNIGHT_POLICY_ID,
  TESTNET_CNIGHT_ASSET_NAME,
  MAINNET_CNIGHT_POLICY_ID,
  MAINNET_CNIGHT_ASSET_NAME,
  getCnightAssetId,
  getCnightAssetName,
  getCnightPolicyId,
} from './cnight-asset';

export {
  getDustGeneratorPlutusV3Script,
  getDustGeneratorScript,
  getDustGeneratorScriptCbor,
  CNIGHT_GENERATES_DUST_TESTNET_CBOR,
  CNIGHT_GENERATES_DUST_MAINNET_CBOR,
} from './scripts';

export {
  encodeCWallet,
  encodeDustMappingDatum,
  dustMappingDatumToCbor,
  decodeDustMappingDatum,
  datumMatchesStakeKey,
  dustActionCreate,
  dustActionBurn,
  dataVoid,
  dustActionCreateCbor,
  dustActionBurnCbor,
  dataVoidCbor,
  getDustGeneratorScriptHash,
  getDustGeneratorPaymentAddress,
  getDustGeneratorRewardAccount,
  getDustMappingNftPolicyId,
  getDustMappingNftAssetId,
  scriptHashAsPolicyId,
  type CWalletVariant,
  type DustMappingDatumValue,
} from './plutus';

export {
  buildNightDesignationTxBlueprint,
  type BuildNightDesignationTxParams,
  type NightDesignationAction,
  type NightDesignationTxBlueprint,
} from './builders';

export {
  CardanoDustNetwork,
  MidnightCoinPubkey,
  MidnightCoinPubkeyError,
  MIDNIGHT_COIN_PUBKEY_LENGTH,
  MIDNIGHT_DUST_ADDRESS_MAX_BYTES,
  CardanoStakeKeyHash,
  CardanoStakeKeyHashError,
  CARDANO_KEY_HASH_LENGTH,
  CardanoPaymentKeyHash,
  DustMappingNftAssetId,
} from './value-objects';
