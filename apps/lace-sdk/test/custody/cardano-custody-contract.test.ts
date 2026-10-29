import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import {
  CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASH,
  CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASHES,
  CARDANO_CUSTODY_LOGIC_HASH,
  CARDANO_CUSTODY_LOGIC_HASHES,
  CARDANO_CUSTODY_LOVELACE_ASSET,
  isCardanoCustodyAccountAddress,
} from '../../src/custody/cardano-custody-contract';

import {
  identity,
  initialState,
  RECIPIENT_ADDRESS,
  record,
} from './custody-fixtures';

/** The account proxy of contract b48545f. */
const ACCOUNT_VALIDATOR_HASH =
  'ed61963ac94d12c0b320be5a336c36af66bc02c380e0aa3001899253';
/** Logic v1 of contract b48545f, applied to the proxy hash. */
const LOGIC_V1_HASH =
  '2cd68e398bdf9fbc8d257614b54403451ee722520ec785fe14f8df5a';

const script = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.ScriptHash,
  hash: Hash28ByteBase16(hash),
});
const key = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: Hash28ByteBase16(hash),
});

const baseAddress = (
  payment: Cardano.Credential,
  stake: Cardano.Credential,
  networkId = Cardano.NetworkId.Testnet,
) => Cardano.BaseAddress.fromCredentials(networkId, payment, stake).toAddress();

describe('custody contract constants', () => {
  it('lists the account validator hash of the pinned contract', () => {
    expect(CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASHES).toEqual([
      ACCOUNT_VALIDATOR_HASH,
    ]);
    expect(CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASH).toBe(ACCOUNT_VALIDATOR_HASH);
    expect(record.accountValidatorHash).toBe(ACCOUNT_VALIDATOR_HASH);
    expect(Object.isFrozen(CARDANO_CUSTODY_ACCOUNT_VALIDATOR_HASHES)).toBe(
      true,
    );
  });

  it('lists logic v1 as the only logic, which new accounts run', () => {
    expect(CARDANO_CUSTODY_LOGIC_HASHES).toEqual([LOGIC_V1_HASH]);
    expect(CARDANO_CUSTODY_LOGIC_HASH).toBe(LOGIC_V1_HASH);
    expect(initialState.logic).toBe(LOGIC_V1_HASH);
    expect(Object.isFrozen(CARDANO_CUSTODY_LOGIC_HASHES)).toBe(true);
  });

  it('names lovelace by the empty policy id and asset name', () => {
    expect(CARDANO_CUSTODY_LOVELACE_ASSET).toEqual({
      policyId: '',
      assetName: '',
    });
    expect(Object.isFrozen(CARDANO_CUSTODY_LOVELACE_ASSET)).toBe(true);
  });
});

describe('isCardanoCustodyAccountAddress', () => {
  const stakeScript = script(record.stakeScriptHash);

  it('accepts a custody account address in bech32 and in hex', () => {
    expect(isCardanoCustodyAccountAddress(record.address)).toBe(true);
    expect(
      isCardanoCustodyAccountAddress(
        Cardano.Address.fromBech32(record.address).toBytes(),
      ),
    ).toBe(true);
  });

  it('accepts the account address on any network', () => {
    const mainnet = baseAddress(
      script(ACCOUNT_VALIDATOR_HASH),
      stakeScript,
      Cardano.NetworkId.Mainnet,
    );

    expect(isCardanoCustodyAccountAddress(mainnet.toBech32())).toBe(true);
  });

  it.each([
    ['an ordinary payment address', RECIPIENT_ADDRESS],
    [
      'the account validator with a key stake part',
      baseAddress(script(ACCOUNT_VALIDATOR_HASH), key('ab'.repeat(28)))
        .toBech32()
        .toString(),
    ],
    [
      'the account validator with no stake part',
      Cardano.EnterpriseAddress.fromCredentials(
        Cardano.NetworkId.Testnet,
        script(ACCOUNT_VALIDATOR_HASH),
      )
        .toAddress()
        .toBech32()
        .toString(),
    ],
    [
      'another payment script',
      baseAddress(script('cd'.repeat(28)), stakeScript)
        .toBech32()
        .toString(),
    ],
    [
      'the account validator hash as a key credential',
      baseAddress(key(ACCOUNT_VALIDATOR_HASH), stakeScript)
        .toBech32()
        .toString(),
    ],
    ['the account reward address', identity.rewardAccount],
    ['text that is not an address', 'not an address'],
  ])('refuses %s', (_, address) => {
    expect(isCardanoCustodyAccountAddress(address)).toBe(false);
  });

  it('refuses a value that is not a string', () => {
    expect(isCardanoCustodyAccountAddress(42 as unknown as string)).toBe(false);
  });
});
