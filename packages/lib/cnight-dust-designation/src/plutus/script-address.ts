import { Cardano } from '@cardano-sdk/core';

import { getDustGeneratorPlutusV3Script } from '../scripts';
import { CardanoDustNetwork } from '../value-objects/network-id.vo';

import type { Serialization } from '@cardano-sdk/core';
import type * as Crypto from '@cardano-sdk/crypto';

// =====================================================================
// Script-derived addresses + identifiers for cnight_generates_dust.
// =====================================================================
// Because the validator is multi-purpose (mint + spend + withdraw), it
// has both a *payment* address (used as the script UTxO's owner) and
// a *reward* (stake) address (used in the update flow's withdrawal
// entry). The dapp's `addressFromValidator()` from `@blaze-cardano/core`
// produces an **enterprise** address (payment-script credential, no
// stake credential) — that's the convention every existing
// designation in the ecosystem uses:
//
//   - mainnet `addr1w9e7ft4rrdd4rkdseguxr9hudfxyytm5ckh2qy0yhz7lfeg9lvhq7`
//     holds 3 333 designation UTxOs (verified on-chain).
//   - preview `addr_test1wplxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qzjheng`
//     holds 1 225 designations.
//   - preprod same testnet shape — 40 of 41 designations.
//
// An earlier version of this file used a base self-staking shape
// (`BaseAddress.fromCredentials(net, scriptCred, scriptCred)`) on the
// mistaken belief that Blaze's helper emitted that shape. The
// validator itself only enforces `address.payment_credential ==
// own_cred` and is agnostic to the stake credential, so both shapes
// are spec-compatible. But ANY designation made at the wrong
// (self-staking base) address is invisible to the upstream dapp + the
// Midnight indexer that drives DUST attribution — they only watch
// the enterprise address. Carbon must match the ecosystem convention.
//
// We reproduce both here from the script's CBOR via cardano-sdk's
// `Serialization.PlutusV3Script.hash()`. The resulting bech32 strings
// must match the dapp's output byte-for-byte for any account holding
// a registration UTxO to be recognised. Network is parameterised; the
// payload (script hash) differs per network because the cNIGHT policy
// id is baked into the CBOR.
//
// The DUST-mapping NFT's policy id IS the script hash — same script
// authorises both mint and spend, so they share the same identifier.
// =====================================================================

export const getDustGeneratorScriptHash = (
  network: CardanoDustNetwork,
): Crypto.Hash28ByteBase16 => getDustGeneratorPlutusV3Script(network).hash();

export const getDustGeneratorPaymentAddress = (
  network: CardanoDustNetwork,
): Cardano.PaymentAddress => {
  const scriptHash = getDustGeneratorScriptHash(network);
  const networkId = CardanoDustNetwork.toNetworkId(network);
  const credential: Cardano.Credential = {
    type: Cardano.CredentialType.ScriptHash,
    hash: scriptHash,
  };
  // Enterprise (payment-script only, no stake credential) — matches
  // the upstream dapp's `addressFromValidator()` convention and the
  // 3 358+ live designations across mainnet + preview + preprod.
  const enterprise = Cardano.EnterpriseAddress.fromCredentials(
    networkId,
    credential,
  );
  return enterprise.toAddress().toBech32() as Cardano.PaymentAddress;
};

export const getDustGeneratorRewardAccount = (
  network: CardanoDustNetwork,
): Cardano.RewardAccount => {
  const scriptHash = getDustGeneratorScriptHash(network);
  const networkId = CardanoDustNetwork.toNetworkId(network);
  const credential: Cardano.Credential = {
    type: Cardano.CredentialType.ScriptHash,
    hash: scriptHash,
  };
  const reward = Cardano.RewardAddress.fromCredentials(networkId, credential);
  return reward.toAddress().toBech32() as Cardano.RewardAccount;
};

export const getDustMappingNftPolicyId = (
  network: CardanoDustNetwork,
): Cardano.PolicyId =>
  Cardano.PolicyId(getDustGeneratorScriptHash(network) as unknown as string);

/**
 * The DUST-mapping NFT minted by the validator has policy = script
 * hash and asset_name = empty bytestring. This is the on-chain
 * identifier callers query for to determine "is this account
 * designated?".
 */
export const getDustMappingNftAssetId = (
  network: CardanoDustNetwork,
): Cardano.AssetId =>
  Cardano.AssetId.fromParts(
    getDustMappingNftPolicyId(network),
    Cardano.AssetName(''),
  );

/**
 * Re-export for callers that already have a `Serialization.Script`
 * instance and want to extract the same identifier without re-reading
 * the CBOR. Pure helper.
 */
export const scriptHashAsPolicyId = (
  script: Serialization.Script,
): Cardano.PolicyId => Cardano.PolicyId(script.hash() as unknown as string);
