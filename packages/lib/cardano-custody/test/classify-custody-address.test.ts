import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  classifyCustodyAddress,
  CURRENT_CUSTODY_CONTRACT_VERSION,
} from '../src';

import {
  OWNER_KEY,
  PREPROD_ADDRESS,
  PREPROD_REWARD_ACCOUNT,
  PREPROD_STAKE_SCRIPT_HASH,
} from './fixtures';

const contractVersion = CURRENT_CUSTODY_CONTRACT_VERSION;

const script = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: Hash28ByteBase16(hash),
});
const key = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: Hash28ByteBase16(hash),
});

const accountValidator = script(contractVersion.accountValidatorHash);
const stakeScript = script(PREPROD_STAKE_SCRIPT_HASH);

const baseAddress = (
  payment: Cardano.Credential,
  stake: Cardano.Credential,
  networkId = Cardano.NetworkId.Testnet,
): Cardano.Address =>
  Cardano.BaseAddress.fromCredentials(networkId, payment, stake).toAddress();

describe('classifyCustodyAddress', () => {
  it('reads a custody account address with its version and stake script', () => {
    expect(
      classifyCustodyAddress(Cardano.Address.fromBech32(PREPROD_ADDRESS)),
    ).toEqual({
      kind: 'account',
      contractVersion,
      stakeScriptHash: PREPROD_STAKE_SCRIPT_HASH,
    });
  });

  it('reads the account address on any network', () => {
    expect(
      classifyCustodyAddress(
        baseAddress(accountValidator, stakeScript, Cardano.NetworkId.Mainnet),
      ),
    ).toMatchObject({ kind: 'account', contractVersion });
  });

  it.each([
    ['a key stake part', baseAddress(accountValidator, key(OWNER_KEY))],
    [
      'no stake part',
      Cardano.EnterpriseAddress.fromCredentials(
        Cardano.NetworkId.Testnet,
        accountValidator,
      ).toAddress(),
    ],
    [
      'a pointer stake part',
      Cardano.PointerAddress.fromCredentials(
        Cardano.NetworkId.Testnet,
        accountValidator,
        {
          slot: 1n,
          txIndex: Cardano.TxIndex(0),
          certIndex: Cardano.CertIndex(0),
        },
      ).toAddress(),
    ],
  ])('reads the account validator with %s as unspendable', (_, address) => {
    expect(classifyCustodyAddress(address)).toEqual({
      kind: 'unspendable',
      contractVersion,
    });
  });

  it.each([
    [
      'another payment script',
      baseAddress(script('cd'.repeat(28)), stakeScript),
    ],
    [
      'the account validator hash as a key credential',
      baseAddress(key(contractVersion.accountValidatorHash), stakeScript),
    ],
    [
      'the account reward address',
      Cardano.Address.fromBech32(PREPROD_REWARD_ACCOUNT),
    ],
  ])('reads %s as other', (_, address) => {
    expect(classifyCustodyAddress(address)).toEqual({ kind: 'other' });
  });
});
