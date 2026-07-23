import { Cardano } from '@cardano-sdk/core';

import { CardanoDustNetwork } from './value-objects/network-id.vo';

// =====================================================================
// cNIGHT / NIGHT asset identification per network.
// =====================================================================
// Sourced from the validator repo (the canonical source of truth):
//   https://github.com/midnightntwrk/midnight-reserve-contracts
//   - aiken.toml: `config.{preview,preprod,mainnet}.cnight_policy.bytes`
//
// Preview + Preprod share the same testnet policy
// (`d2dbff62…`); Mainnet uses a distinct policy (`0691b2fe…`) with
// the asset named "NIGHT" (ASCII).
//
// Empty asset name on testnet is intentional — Aiken / Plutus tooling
// uses the empty bytestring to mean "the policy's primary token". We
// keep the policy id + hex name together as constants so callers
// reconstruct the full asset id via the standard cardano-sdk shape.
// =====================================================================

export const TESTNET_CNIGHT_POLICY_ID = Cardano.PolicyId(
  'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1',
);
export const TESTNET_CNIGHT_ASSET_NAME = Cardano.AssetName('');

export const MAINNET_CNIGHT_POLICY_ID = Cardano.PolicyId(
  '0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa',
);
/** "NIGHT" in hex — the mainnet cNIGHT token is named NIGHT. */
export const MAINNET_CNIGHT_ASSET_NAME = Cardano.AssetName('4e49474854');

export const getCnightAssetId = (
  network: CardanoDustNetwork,
): Cardano.AssetId => {
  const policyId =
    network === CardanoDustNetwork.mainnet
      ? MAINNET_CNIGHT_POLICY_ID
      : TESTNET_CNIGHT_POLICY_ID;
  const assetName =
    network === CardanoDustNetwork.mainnet
      ? MAINNET_CNIGHT_ASSET_NAME
      : TESTNET_CNIGHT_ASSET_NAME;
  return Cardano.AssetId.fromParts(policyId, assetName);
};

export const getCnightPolicyId = (
  network: CardanoDustNetwork,
): Cardano.PolicyId =>
  network === CardanoDustNetwork.mainnet
    ? MAINNET_CNIGHT_POLICY_ID
    : TESTNET_CNIGHT_POLICY_ID;

export const getCnightAssetName = (
  network: CardanoDustNetwork,
): Cardano.AssetName =>
  network === CardanoDustNetwork.mainnet
    ? MAINNET_CNIGHT_ASSET_NAME
    : TESTNET_CNIGHT_ASSET_NAME;
