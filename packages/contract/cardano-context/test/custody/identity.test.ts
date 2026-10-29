import { Cardano } from '@cardano-sdk/core';
import { Ed25519KeyHashHex, Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { describe, expect, it } from 'vitest';

import { verifyCardanoCustodyAccountIdentity } from '../../src';
import {
  cardanoCustodyAccount,
  custodyAddress,
  custodyRewardAccount,
  custodyStakeScriptHash,
  foreignPaymentAddress,
} from '../custody-mocks';

const stored = cardanoCustodyAccount.blockchainSpecific;

describe('verifyCardanoCustodyAccountIdentity', () => {
  it('returns the derived identity when every stored field matches it', () => {
    const result = verifyCardanoCustodyAccountIdentity(stored);

    expect(result).toMatchObject({
      ok: true,
      value: {
        address: custodyAddress,
        rewardAccount: custodyRewardAccount,
        stakeScriptHash: custodyStakeScriptHash,
        chainId: Cardano.ChainIds.Preprod,
      },
    });
  });

  it('refuses a stored address the creator key does not derive', () => {
    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        address: foreignPaymentAddress,
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'identity-mismatch',
        field: 'address',
        stored: foreignPaymentAddress,
        derived: custodyAddress,
      },
    });
  });

  it('refuses a stored reward account the creator key does not derive', () => {
    const mainnetRewardAccount = Cardano.RewardAccount.fromCredential(
      { type: Cardano.CredentialType.ScriptHash, hash: custodyStakeScriptHash },
      Cardano.NetworkId.Mainnet,
    );

    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        rewardAccount: mainnetRewardAccount,
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'identity-mismatch',
        field: 'rewardAccount',
        stored: mainnetRewardAccount,
        derived: custodyRewardAccount,
      },
    });
  });

  it('refuses a stored stake script hash the creator key does not derive', () => {
    const otherHash = Hash28ByteBase16('cd'.repeat(28));

    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        stakeScriptHash: otherHash,
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'identity-mismatch',
        field: 'stakeScriptHash',
        stored: otherHash,
        derived: custodyStakeScriptHash,
      },
    });
  });

  it('refuses a testnet address stored for a mainnet chain', () => {
    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        chainId: Cardano.ChainIds.Mainnet,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'identity-mismatch', field: 'address' },
    });
  });

  it('refuses a chain id whose network id contradicts its magic', () => {
    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        chainId: {
          networkId: Cardano.NetworkId.Mainnet,
          networkMagic: Cardano.NetworkMagics.Preprod,
        },
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-chain-id' } });
  });

  it('refuses an account validator outside the version registry', () => {
    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        accountValidatorHash: Hash28ByteBase16('00'.repeat(28)),
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'unsupported-contract-version',
        accountValidatorHash: '00'.repeat(28),
      },
    });
  });

  it('refuses a creator key hash that is not 28 bytes', () => {
    expect(
      verifyCardanoCustodyAccountIdentity({
        ...stored,
        creatorKeyHash: Ed25519KeyHashHex('ab'.repeat(28)).slice(
          2,
        ) as Ed25519KeyHashHex,
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid-key-hash' } });
  });
});
