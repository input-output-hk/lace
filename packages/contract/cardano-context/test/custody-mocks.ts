import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  Bip32PublicKeyHex,
  Ed25519KeyHashHex,
  Hash28ByteBase16,
} from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { BlockchainNetworkId } from '@lace-contract/network';
import {
  ACCOUNT_VALIDATOR_HASH,
  custodyGrantAssetId,
  encodeCustodyAccountState,
  encodeCustodyGrant,
  LOGIC_V1_HASH,
} from '@lace-lib/cardano-custody';

import { CardanoAccountId, CardanoCustodyWalletId } from '../src';

import type { CardanoCustodyAccount, RequiredProtocolParameters } from '../src';
import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyScope,
} from '@lace-lib/cardano-custody';

/**
 * Lace's Preprod creator key hash and the account the pinned contract
 * derives for it. A derived vector, not chain evidence.
 */
export const custodyCreatorKeyHash = Ed25519KeyHashHex(
  '0e2eb8b05c17851fe132bf308e9bc712ef13191d3899c06b926780e1',
);
export const custodyStakeScriptHash = Hash28ByteBase16(
  'f176158fcbbdfc44c1e3b3f0863032dc048c091738b0fa4107975157',
);
export const custodyAddress = Cardano.PaymentAddress(
  'addr_test1xrkkr936e9x39s9nyzl95vmvx6hkd0qzcwqwp23sqxyey5l3wc2cljaal3zvrcan7zrrqvkuqjxqj9eckrayzpuh29tsszhnvv',
);
export const custodyRewardAccount = Cardano.RewardAccount(
  'stake_test17rchv9v0ew7lc3xpuwelpp3sxtwqfrqfzuutp7jpq7t4z4cnrk4ek',
);
export const custodyStateNftId = Cardano.AssetId.fromParts(
  Cardano.PolicyId(ACCOUNT_VALIDATOR_HASH),
  Cardano.AssetName(custodyStakeScriptHash),
);

export const custodyDeviceKeyHash = Ed25519KeyHashHex('aa'.repeat(28));
export const otherDeviceKeyHash = Ed25519KeyHashHex('ee'.repeat(28));

/** Preprod's price of a UTxO byte. */
export const custodyProtocolParameters: Pick<
  RequiredProtocolParameters,
  'coinsPerUtxoByte'
> = { coinsPerUtxoByte: 4310 };

/**
 * An address carrying the custody stake credential under a key payment
 * credential: it does not belong to the custody account.
 */
export const foreignPaymentAddress = Cardano.BaseAddress.fromCredentials(
  Cardano.NetworkId.Testnet,
  {
    type: Cardano.CredentialType.KeyHash,
    hash: Hash28ByteBase16('bb'.repeat(28)),
  },
  { type: Cardano.CredentialType.ScriptHash, hash: custodyStakeScriptHash },
)
  .toAddress()
  .toBech32() as Cardano.PaymentAddress;

const custodyWalletId = CardanoCustodyWalletId.derive(
  Cardano.NetworkMagics.Preprod,
  custodyStakeScriptHash,
);

export const cardanoCustodyAccount: CardanoCustodyAccount = {
  accountId: CardanoAccountId(
    custodyWalletId,
    0,
    Cardano.NetworkMagics.Preprod,
  ),
  walletId: custodyWalletId,
  accountType: 'CardanoCustody',
  blockchainName: 'Cardano',
  blockchainNetworkId: BlockchainNetworkId('cardano-1'),
  networkType: 'testnet',
  metadata: { name: 'custody' },
  blockchainSpecific: {
    chainId: Cardano.ChainIds.Preprod,
    accountValidatorHash: ACCOUNT_VALIDATOR_HASH,
    creatorKeyHash: custodyCreatorKeyHash,
    stakeScriptHash: custodyStakeScriptHash,
    address: custodyAddress,
    rewardAccount: custodyRewardAccount,
    device: {
      extendedAccountPublicKey: Bip32PublicKeyHex('ab'.repeat(64)),
      index: 0,
      keyHash: custodyDeviceKeyHash,
      channel: { type: 'hosted', origin: 'https://signer.example' },
    },
  },
};

/** The same account opened without a device binding. */
export const observerCustodyAccount: CardanoCustodyAccount = {
  ...cardanoCustodyAccount,
  blockchainSpecific: {
    ...cardanoCustodyAccount.blockchainSpecific,
    device: undefined,
  },
};

/** The state a creation writes for the bound device. */
export const custodyState: CustodyAccountState = {
  logic: HexBlob(LOGIC_V1_HASH),
  devices: [HexBlob(custodyDeviceKeyHash)],
  grantGeneration: 0n,
  nextSlot: 0n,
  revoked: [],
  outstanding: 0n,
};

const txId = (seed: number) =>
  Cardano.TransactionId(seed.toString(16).padStart(64, '0'));

/** Plutus data exactly as a chain read decodes it. */
const asChainReads = (data: Cardano.PlutusData): Cardano.PlutusData =>
  Serialization.PlutusData.fromCbor(
    Serialization.PlutusData.fromCore(data).toCbor(),
  ).toCore();

/** The control datum exactly as a chain read decodes it. */
export const custodyDatum = (state: CustodyAccountState): Cardano.PlutusData =>
  asChainReads(encodeCustodyAccountState(state));

export const custodyUtxo = (
  seed: number,
  output: Partial<Cardano.TxOut> & { coins?: bigint },
): Cardano.Utxo => {
  const { coins = 2_000_000n, ...txOut } = output;
  const address = txOut.address ?? custodyAddress;
  return [
    { txId: txId(seed), index: 0, address },
    { address, value: { coins }, ...txOut },
  ];
};

export const controlUtxo = (
  seed: number,
  state: CustodyAccountState = custodyState,
  coins = 3_000_000n,
): Cardano.Utxo =>
  custodyUtxo(seed, {
    value: { coins, assets: new Map([[custodyStateNftId, 1n]]) },
    datum: custodyDatum(state),
  });

/** A lovelace scope: 10 tADA per call and 50 tADA in total, expiring at `expiresAt`. */
export const custodyLovelaceScope = (
  expiresAt: bigint,
  scope: Partial<CustodyScope> = {},
): CustodyScope => ({
  asset: { policyId: HexBlob(''), assetName: HexBlob('') },
  perCallCap: 10_000_000n,
  cap: 50_000_000n,
  lovelacePerCallCap: 0n,
  lovelaceCap: 0n,
  expiresAt,
  recipients: [],
  ...scope,
});

/** A grant of generation 0 to the key hash of `byte`×28. */
export const custodyGrant = (
  slot: bigint,
  byte: string,
  scope: CustodyScope,
): CustodyGrant => ({
  slot,
  grantee: HexBlob(byte.repeat(28)),
  generation: 0n,
  scope,
});

/** The grant UTxO of `grant`: its token and its inline datum. */
export const grantUtxo = (
  seed: number,
  grant: CustodyGrant,
  coins = 2_000_000n,
): Cardano.Utxo =>
  custodyUtxo(seed, {
    value: {
      coins,
      assets: new Map([
        [
          custodyGrantAssetId(
            cardanoCustodyAccount.blockchainSpecific,
            grant.slot,
          ),
          1n,
        ],
      ]),
    },
    datum: asChainReads(encodeCustodyGrant(grant)),
  });
