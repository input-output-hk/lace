import { Cardano, Serialization } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import {
  CURRENT_CUSTODY_CONTRACT_VERSION,
  deriveCustodyAccountIdentity,
} from '../src';
import { chainIdFromNetworkMagic } from '../src/identity';

import {
  OWNER_STAKE_SCRIPT_HASH,
  OWNER_TESTNET_ADDRESS,
  OWNER_TESTNET_REWARD_ACCOUNT,
  PREPROD_ADDRESS,
  PREPROD_OWNER,
  PREPROD_REWARD_ACCOUNT,
  PREPROD_STAKE_SCRIPT_HASH,
} from './fixtures';

import type { CustodyAccountIdentity } from '../src';

const contractVersion = CURRENT_CUSTODY_CONTRACT_VERSION;

const identityOf = (
  creatorKeyHash: string,
  chainId: Cardano.ChainId,
): CustodyAccountIdentity => {
  const result = deriveCustodyAccountIdentity({
    contractVersion,
    creatorKeyHash,
    chainId,
  });
  if (!result.ok) throw new Error(`Creator ${creatorKeyHash} was refused`);
  return result.value;
};

describe('deriveCustodyAccountIdentity', () => {
  it('derives the account of the Preprod creator', () => {
    const identity = identityOf(PREPROD_OWNER, Cardano.ChainIds.Preprod);
    expect(identity.stakeScriptHash).toBe(PREPROD_STAKE_SCRIPT_HASH);
    expect(identity.address).toBe(PREPROD_ADDRESS);
    expect(identity.rewardAccount).toBe(PREPROD_REWARD_ACCOUNT);
    expect(identity.stateNftAssetId).toBe(
      `${contractVersion.accountValidatorHash}${PREPROD_STAKE_SCRIPT_HASH}`,
    );
    expect(identity.creatorKeyHash).toBe(PREPROD_OWNER);
    expect(identity.chainId).toBe(Cardano.ChainIds.Preprod);
    expect(identity.contractVersion).toBe(contractVersion);
  });

  it('pays to the account validator and stakes with the stake script', () => {
    const identity = identityOf(PREPROD_OWNER, Cardano.ChainIds.Preprod);
    const base = Cardano.Address.fromBech32(identity.address).asBase();
    expect(base?.getPaymentCredential()).toEqual({
      type: Cardano.CredentialType.ScriptHash,
      hash: contractVersion.accountValidatorHash,
    });
    expect(base?.getStakeCredential()).toEqual({
      type: Cardano.CredentialType.ScriptHash,
      hash: identity.stakeScriptHash,
    });
    expect(Cardano.AssetId.getPolicyId(identity.stateNftAssetId)).toBe(
      contractVersion.accountValidatorHash,
    );
    expect(Cardano.AssetId.getAssetName(identity.stateNftAssetId)).toBe(
      identity.stakeScriptHash,
    );
  });

  it('returns a Plutus V3 stake script that hashes to the stake credential', () => {
    const { stakeScript, stakeScriptHash } = identityOf(
      'aa'.repeat(28),
      Cardano.ChainIds.Preview,
    );
    expect(stakeScript.__type).toBe(Cardano.ScriptType.Plutus);
    expect(stakeScript.version).toBe(Cardano.PlutusLanguageVersion.V3);
    expect(stakeScriptHash).toBe(OWNER_STAKE_SCRIPT_HASH);
    expect(Serialization.Script.fromCore(stakeScript).hash()).toBe(
      stakeScriptHash,
    );
    expect(
      Serialization.PlutusV3Script.fromCbor(
        Serialization.Script.fromCore(stakeScript).asPlutusV3()!.toCbor(),
      ).hash(),
    ).toBe(stakeScriptHash);
  });

  it('keeps the stake credential on every network and changes only the address network', () => {
    const preprod = identityOf('aa'.repeat(28), Cardano.ChainIds.Preprod);
    const preview = identityOf('aa'.repeat(28), Cardano.ChainIds.Preview);
    const mainnet = identityOf('aa'.repeat(28), Cardano.ChainIds.Mainnet);
    expect(preprod.address).toBe(OWNER_TESTNET_ADDRESS);
    expect(preprod.rewardAccount).toBe(OWNER_TESTNET_REWARD_ACCOUNT);
    expect(mainnet.address).toBe(
      'addr1x8kkr936e9x39s9nyzl95vmvx6hkd0qzcwqwp23sqxyey56d67zhz80j5x302vutww5gu0x3n8ks3fhe3cjaz02dhp2q0swhm6',
    );
    expect(mainnet.rewardAccount).toBe(
      'stake179xa0pt3rhe2rgh4xw9h82yw8ngenmgg5mucufw384xms4qlgck2y',
    );
    expect(preprod.stateNftAssetId).toBe(
      `ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253${OWNER_STAKE_SCRIPT_HASH}`,
    );
    expect(preview.address).toBe(preprod.address);
    expect(preview.chainId.networkMagic).not.toBe(preprod.chainId.networkMagic);
    expect(
      new Set(
        [preprod, preview, mainnet].map(identity => identity.stakeScriptHash),
      ).size,
    ).toBe(1);
    expect(
      new Set(
        [preprod, preview, mainnet].map(identity => identity.stateNftAssetId),
      ).size,
    ).toBe(1);
  });

  it('gives another creator another account', () => {
    expect(
      identityOf('bb'.repeat(28), Cardano.ChainIds.Preprod).stakeScriptHash,
    ).not.toBe(
      identityOf('aa'.repeat(28), Cardano.ChainIds.Preprod).stakeScriptHash,
    );
  });

  it('refuses a creator key hash that is not 28 bytes of lower-case hex', () => {
    for (const creatorKeyHash of [
      'aa'.repeat(27),
      'aa'.repeat(29),
      'AA'.repeat(28),
      'zz'.repeat(28),
      '',
    ]) {
      expect(
        deriveCustodyAccountIdentity({
          contractVersion,
          creatorKeyHash,
          chainId: Cardano.ChainIds.Preprod,
        }),
      ).toEqual({
        ok: false,
        error: { code: 'invalid-key-hash', keyHash: creatorKeyHash },
      });
    }
  });

  it('refuses a chain id whose network id contradicts its network magic', () => {
    const contradictory: Cardano.ChainId[] = [
      {
        networkId: Cardano.NetworkId.Testnet,
        networkMagic: Cardano.NetworkMagics.Mainnet,
      },
      {
        networkId: Cardano.NetworkId.Mainnet,
        networkMagic: Cardano.NetworkMagics.Preprod,
      },
      { networkId: 2 as Cardano.NetworkId, networkMagic: 42 },
      { networkId: Cardano.NetworkId.Testnet, networkMagic: -1 },
      { networkId: Cardano.NetworkId.Testnet, networkMagic: 1.5 },
      { networkId: Cardano.NetworkId.Testnet, networkMagic: 2 ** 32 },
      { networkId: Cardano.NetworkId.Testnet, networkMagic: Number.NaN },
    ];
    for (const chainId of contradictory) {
      expect(
        deriveCustodyAccountIdentity({
          contractVersion,
          creatorKeyHash: PREPROD_OWNER,
          chainId,
        }),
      ).toEqual({ ok: false, error: { code: 'invalid-chain-id', chainId } });
    }
  });

  it('accepts a custom network that uses network id 0', () => {
    const chainId = { networkId: Cardano.NetworkId.Testnet, networkMagic: 42 };
    expect(identityOf(PREPROD_OWNER, chainId).address).toBe(PREPROD_ADDRESS);
  });
});

describe('chainIdFromNetworkMagic', () => {
  it('maps mainnet to network id 1 and every other magic to 0', () => {
    expect(chainIdFromNetworkMagic(Cardano.NetworkMagics.Mainnet)).toEqual(
      Cardano.ChainIds.Mainnet,
    );
    for (const chainId of [
      Cardano.ChainIds.Preprod,
      Cardano.ChainIds.Preview,
      Cardano.ChainIds.Sanchonet,
    ]) {
      expect(chainIdFromNetworkMagic(chainId.networkMagic)).toEqual(chainId);
    }
  });
});
