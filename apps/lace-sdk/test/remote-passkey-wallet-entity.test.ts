import { Cardano } from '@cardano-sdk/core';
import { WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { PasskeyWalletMismatchError } from '../src/passkey-wallet-mismatch-error';
import { createRemotePasskeyWalletEntity } from '../src/remote-passkey-wallet-entity';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';

const accountXpub =
  '928f23856ef3f6edc6adc14d7fb39b15cfb985b9bb038755158cf2ad6cdd8281d601bb8f919e2feb0183b1462a59fce5c7acde2cf10ccd10e213d02ff0d0a7a7' as Bip32PublicKeyHex;
const otherXpub = 'ab'.repeat(64) as Bip32PublicKeyHex;

const signer = (publicKey = accountXpub) => ({
  accountPublicKey: vi.fn(async () => publicKey),
});

describe('createRemotePasskeyWalletEntity', () => {
  it('builds a lazy wallet whose mainnet and testnet accounts carry the served key', async () => {
    const remote = signer();

    const { entity, publicKey } = await createRemotePasskeyWalletEntity({
      signer: remote,
      walletName: 'Preprod',
    });

    expect(remote.accountPublicKey).toHaveBeenCalledWith(0);
    expect(publicKey).toBe(accountXpub);
    expect(entity.type).toBe('LazyInMemory');
    expect(entity.walletId).toBe(
      WalletId.deriveFromBip32PublicKey(accountXpub),
    );
    expect(entity.metadata).toEqual({ name: 'Preprod', order: 0 });
    expect(entity.accounts.map(account => account.networkType)).toEqual([
      'mainnet',
      'testnet',
      'testnet',
    ]);
    expect(
      entity.accounts.map(account => account.blockchainSpecific.chainId),
    ).toEqual([
      Cardano.ChainIds.Mainnet,
      Cardano.ChainIds.Preprod,
      Cardano.ChainIds.Preview,
    ]);
    for (const account of entity.accounts) {
      expect(account.accountType).toBe('LazyInMemory');
      expect(account.blockchainName).toBe('Cardano');
      expect(account.walletId).toBe(entity.walletId);
      expect(account.blockchainSpecific.accountIndex).toBe(0);
      expect(account.blockchainSpecific.extendedAccountPublicKey).toBe(
        accountXpub,
      );
    }
    expect(JSON.stringify(entity)).not.toMatch(
      /encryptedRootPrivateKey|encryptedRecoveryPhrase/,
    );
  });

  it('opens the requested account index', async () => {
    const remote = signer();

    const { entity } = await createRemotePasskeyWalletEntity({
      signer: remote,
      walletName: 'Savings',
      accountIndex: 3,
      order: 1,
    });

    expect(remote.accountPublicKey).toHaveBeenCalledWith(3);
    expect(entity.metadata.order).toBe(1);
    for (const account of entity.accounts) {
      expect(account.blockchainSpecific.accountIndex).toBe(3);
      expect(account.accountId).toContain('-3-');
    }
  });

  it('reopens the same entity from the persisted public key', async () => {
    const first = await createRemotePasskeyWalletEntity({
      signer: signer(),
      walletName: 'Preprod',
    });
    const reopened = await createRemotePasskeyWalletEntity({
      signer: signer(),
      walletName: 'Preprod',
      expectedPublicKey: first.publicKey,
    });

    expect(reopened.entity).toEqual(first.entity);
    expect(reopened.publicKey).toBe(first.publicKey);
  });

  it('refuses another account before building an entity', async () => {
    const remote = signer(otherXpub);

    await expect(
      createRemotePasskeyWalletEntity({
        signer: remote,
        walletName: 'Preprod',
        expectedPublicKey: accountXpub,
      }),
    ).rejects.toThrow(PasskeyWalletMismatchError);
    expect(remote.accountPublicKey).toHaveBeenCalledTimes(1);
  });

  it('propagates the signer refusal before any entity is built', async () => {
    await expect(
      createRemotePasskeyWalletEntity({
        signer: {
          accountPublicKey: vi.fn(async () => {
            throw new Error('declined');
          }),
        },
        walletName: 'Preprod',
      }),
    ).rejects.toThrow('declined');
  });
});
