import type { NightDesignationAction } from '../night-designation-flow/types';
import type { Cardano } from '@cardano-sdk/core';

// =====================================================================
// cNIGHT DUST designation script-address registry.
// =====================================================================
// The cNIGHT-on-Cardano DUST designation feature uses a Plutus V3
// multi-purpose validator (`cnight_generates_dust`) deployed at a
// single address per network. A tx is a designation iff at least
// one of its hydrated inputs OR outputs touches the script address
// for the active network.
//
// Three on-chain action variants:
//
//   - `designate`: mints 1 DUST-mapping NFT and pays to the script
//     address with an inline `DustMappingDatum`. No script UTxO in
//     inputs.
//
//   - `update`: spends the existing script UTxO (carrying the NFT)
//     and pays it back with a new datum. No mint (mint quantity = 0
//     for the NFT policy).
//
//   - `deregister`: spends the existing script UTxO and burns the
//     NFT (mint quantity = -1 for the NFT policy). No script output.
//
// Action is inferred from the mint entry + script-UTxO presence in
// inputs; the registry alone classifies the tx as "NightDesignation"
// but the inspector resolves the variant from the tx body.
//
// `dustPubkeyHex` (the 32-byte Midnight coin pubkey written into the
// new DustMappingDatum) is NOT extracted from the on-chain tx in
// this classifier — that requires decoding the inline datum's
// PlutusData. The pending-activity side-effect carries it directly
// from the slice state (where it's known to the caller); the
// confirmed activity's metadata leaves it undefined and downstream
// rendering shows the action variant only when the pubkey is
// missing.
//
// The golden values below are the validator's derived enterprise
// script address + NFT policy id per network; the canonical
// derivation (and the regression guard that asserts these exact
// strings) lives in `@lace-lib/cnight-dust-designation`'s
// `script-address.test.ts`. Hardcoded here as a static membership
// registry — same shape as `dex-script-addresses` — so the hot-path
// classifier stays a pure string lookup with no CBOR parsing. Both
// testnets (preview + preprod) share the same script (and therefore
// the same `addr_test1...` address) — they only differ in
// `chainId.networkMagic`.
//
// Membership testing against the raw bech32 string mirrors the
// dex-script-addresses registry shape — see that file's comment for
// the matching rationale.
// =====================================================================

// Canonical action vocabulary lives with the flow (same package).
export type { NightDesignationAction };

export type NightDesignationClassification = {
  action: NightDesignationAction;
};

const SCRIPT_ADDRESSES: ReadonlySet<string> = new Set([
  // Mainnet — enterprise (payment-script-only, no stake credential).
  // Matches the convention upstream's reference dApp + the Midnight
  // indexer use; verified on-chain as the home of all 3 333 live
  // mainnet designations.
  'addr1w9e7ft4rrdd4rkdseguxr9hudfxyytm5ckh2qy0yhz7lfeg9lvhq7',
  // Testnet (preview + preprod share the same testnet script blob).
  // Enterprise shape — same rationale as mainnet.
  'addr_test1wplxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qzjheng',
]);

const NFT_POLICY_IDS: ReadonlySet<string> = new Set([
  // Mainnet — NFT policy id equals script hash
  '73e4aea31b5b51d9b0ca386196fc6a4c422f74c5aea011e4b8bdf4e5',
  // Testnet
  '7e69087d98fac5869eac14e13dfb6f98228c41e638aa2a59d1f85e9c',
]);

const isScriptAddress = (address: Cardano.PaymentAddress): boolean =>
  SCRIPT_ADDRESSES.has(String(address));

const hasNightDesignationNftPolicyId = (
  policyId: Cardano.PolicyId | string,
): boolean => NFT_POLICY_IDS.has(String(policyId));

/**
 * Inspect the tx body to determine the night-designation action.
 *
 * Designate: NFT mint with positive quantity (no existing UTxO to
 * spend).
 *
 * Deregister: NFT mint with negative quantity (existing UTxO is
 * spent, NFT is burned).
 *
 * Update: no NFT mint, but the script address appears in BOTH
 * inputs (spending the existing UTxO) and outputs (paying it back
 * with a new datum). This is the fallback when there's no
 * discriminating mint entry.
 */
const inferAction = (
  inputs: readonly Cardano.HydratedTxIn[],
  outputs: readonly Cardano.TxOut[],
  mint: Cardano.TokenMap | undefined,
): NightDesignationAction => {
  if (mint) {
    for (const [assetId, quantity] of mint) {
      const policyId = String(assetId).slice(0, 56);
      if (!hasNightDesignationNftPolicyId(policyId)) continue;
      if (quantity > BigInt(0)) return 'designate';
      if (quantity < BigInt(0)) return 'deregister';
    }
  }
  const hasSpentScript = inputs.some(input => isScriptAddress(input.address));
  const hasProducedScript = outputs.some(output =>
    isScriptAddress(output.address),
  );
  if (hasSpentScript && hasProducedScript) return 'update';
  if (hasProducedScript) return 'designate';
  // Fallthrough: hasSpentScript only → deregister-shape. This branch
  // is hit when a tx burns the script UTxO without an explicit mint
  // entry (shouldn't happen with the current validator, but cheap
  // to handle defensively).
  return 'deregister';
};

/**
 * Returns the classification for a tx that touches the
 * cNIGHT-designation script address, or `undefined` if neither
 * inputs nor outputs match. Deterministic — depends only on the
 * tx body + the static registry above.
 *
 * Inputs catch update / deregister (spending the existing
 * registration UTxO). Outputs catch designate (paying the new
 * registration UTxO) and the producing leg of update.
 */
export const classifyTxAsNightDesignation = (
  inputs: readonly Cardano.HydratedTxIn[],
  outputs: readonly Cardano.TxOut[] = [],
  mint?: Cardano.TokenMap,
): NightDesignationClassification | undefined => {
  const isScriptTouched =
    inputs.some(input => isScriptAddress(input.address)) ||
    outputs.some(output => isScriptAddress(output.address));
  if (!isScriptTouched) return undefined;
  return { action: inferAction(inputs, outputs, mint) };
};
