// Ported from Biglup/cardano-account-custody-contract offchain/src/address.ts and
// offchain/src/discovery.ts at revision b48545f4be850c1044de2dbeb51751718b4b8e70
// (Apache-2.0). Modified for Lace: the identity is derived for an explicit
// contract version and chain, and carries the network magic.

import { Cardano, Serialization } from '@cardano-sdk/core';

import { isHash28Hex } from './hex';
import { fail, ok } from './result';
import { applyStakeValidatorToOwner } from './stake-script';

import type { CustodyContractVersion } from './contract-version';
import type { CustodyResult } from './result';
import type { Ed25519KeyHashHex, Hash28ByteBase16 } from '@cardano-sdk/crypto';

/**
 * Everything that identifies one custody account, all derived from the
 * contract version, the creator key hash and the chain. Preprod and Preview
 * share network id 0 and therefore addresses, so the chain id carries the
 * network magic that tells them apart.
 */
export interface CustodyAccountIdentity {
  readonly contractVersion: CustodyContractVersion;
  readonly chainId: Cardano.ChainId;
  /** The `owner` the stake validator is applied to. */
  readonly creatorKeyHash: Ed25519KeyHashHex;
  /** Witness for every registration, delegation and withdrawal of the account. */
  readonly stakeScript: Cardano.PlutusScript;
  /** The account's stake credential; the same on every network. */
  readonly stakeScriptHash: Hash28ByteBase16;
  /** Base address: the account validator as payment, the stake script as stake. */
  readonly address: Cardano.PaymentAddress;
  readonly rewardAccount: Cardano.RewardAccount;
  /** Policy: the account validator hash. Asset name: the stake script hash. */
  readonly stateNftAssetId: Cardano.AssetId;
}

interface CustodyInvalidKeyHash {
  readonly code: 'invalid-key-hash';
  readonly keyHash: string;
}

/**
 * A chain whose network magic is not a 32-bit unsigned integer, or whose
 * network id is not the one that magic implies.
 */
interface CustodyInvalidChainId {
  readonly code: 'invalid-chain-id';
  readonly chainId: Cardano.ChainId;
}

export type CustodyAccountIdentityError =
  | CustodyInvalidChainId
  | CustodyInvalidKeyHash;

interface CustodyAccountIdentityParams {
  readonly contractVersion: CustodyContractVersion;
  /** Lower-case hex of exactly 28 bytes. */
  readonly creatorKeyHash: string;
  readonly chainId: Cardano.ChainId;
}

/**
 * Derives the identity of a creator key hash and chain id the caller has
 * already validated.
 */
export const identityOfValidatedCreator = ({
  contractVersion,
  creatorKeyHash,
  chainId,
}: CustodyAccountIdentityParams): CustodyAccountIdentity => {
  const stakeScript: Cardano.PlutusScript = {
    __type: Cardano.ScriptType.Plutus,
    bytes: applyStakeValidatorToOwner(contractVersion, creatorKeyHash),
    version: Cardano.PlutusLanguageVersion.V3,
  };
  const stakeScriptHash = Serialization.Script.fromCore(stakeScript).hash();
  const stakeCredential: Cardano.Credential = {
    type: Cardano.CredentialType.ScriptHash,
    hash: stakeScriptHash,
  };
  const address = Cardano.BaseAddress.fromCredentials(
    chainId.networkId,
    {
      type: Cardano.CredentialType.ScriptHash,
      hash: contractVersion.accountValidatorHash,
    },
    stakeCredential,
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

  return {
    contractVersion,
    chainId,
    creatorKeyHash: creatorKeyHash as Ed25519KeyHashHex,
    stakeScript,
    stakeScriptHash,
    address,
    rewardAccount: Cardano.RewardAccount.fromCredential(
      stakeCredential,
      chainId.networkId,
    ),
    stateNftAssetId: Cardano.AssetId.fromParts(
      Cardano.PolicyId(contractVersion.accountValidatorHash),
      Cardano.AssetName(stakeScriptHash),
    ),
  };
};

const MAINNET_NETWORK_MAGIC: Cardano.NetworkMagic =
  Cardano.NetworkMagics.Mainnet;

/**
 * The chain a network magic names. Records carry only the magic; every
 * Cardano network except mainnet uses network id 0.
 */
export const chainIdFromNetworkMagic = (
  networkMagic: Cardano.NetworkMagic,
): Cardano.ChainId => ({
  networkId:
    networkMagic === MAINNET_NETWORK_MAGIC
      ? Cardano.NetworkId.Mainnet
      : Cardano.NetworkId.Testnet,
  networkMagic,
});

/** Whether a value is a network magic: a 32-bit unsigned integer. */
export const isNetworkMagic = (value: unknown): value is Cardano.NetworkMagic =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 0xff_ff_ff_ff;

/**
 * Whether a chain id is one a record can name: the record keeps only the
 * magic, so the network id must be the one the magic implies.
 */
const isConsistentChainId = ({
  networkId,
  networkMagic,
}: Cardano.ChainId): boolean =>
  isNetworkMagic(networkMagic) &&
  networkId === chainIdFromNetworkMagic(networkMagic).networkId;

/**
 * The identity of the account a creator key hash creates on a chain. Refuses
 * a key hash that is not lower-case hex of exactly 28 bytes, and a chain id
 * whose network id contradicts its network magic, such as network id 0 with
 * the mainnet magic.
 */
export const deriveCustodyAccountIdentity = (
  params: CustodyAccountIdentityParams,
): CustodyResult<CustodyAccountIdentity, CustodyAccountIdentityError> => {
  if (!isConsistentChainId(params.chainId)) {
    return fail({ code: 'invalid-chain-id', chainId: params.chainId });
  }
  return isHash28Hex(params.creatorKeyHash)
    ? ok(identityOfValidatedCreator(params))
    : fail({ code: 'invalid-key-hash', keyHash: params.creatorKeyHash });
};
