import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { createCardanoKeyAgentFromMnemonic } from '@lace-contract/cardano-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { Bip32Account } from '@lace-lib/core';
import { createPasskeyKeySource } from '@lace-lib/passkey';
import { HDKey } from '@scure/bip32';
import * as bitcoin from 'bitcoinjs-lib';
import { pbkdf2Sync } from 'pbkdf2';
import { describe, expect, it, vi } from 'vitest';

// Test-only imports of the real wallet integrations; no Bitcoin production module enters the SDK.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  AddressType as BitcoinAddressType,
  deriveAddressByType,
} from '../../../packages/module/blockchain-bitcoin/src/common/address';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  ChainType,
  deriveAccountRootKeyPair,
  deriveBip39Seed,
  deriveChildPublicKey,
} from '../../../packages/module/blockchain-bitcoin/src/common/keyDerivation';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { initializeWallet as initializeCardanoWallet } from '../../../packages/module/blockchain-cardano/src/in-memory-wallet-integration';
import { passkeyAccountPublicKey } from '../src/passkey-account-public-key';
import { createPasskeyWalletEntity } from '../src/passkey-wallet-entity';
import { PasskeyWalletMismatchError } from '../src/passkey-wallet-mismatch-error';

import type { LaceWallet } from '../src/create-lace-wallet';
import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type { PasskeyKeySource } from '@lace-lib/passkey';

const cryptoOverride = vi.hoisted(() => ({
  words: undefined as string[] | undefined,
}));

vi.mock('@lace-lib/crypto', async importOriginal => {
  const actual = await importOriginal<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('@lace-lib/crypto')
  >();
  return {
    ...actual,
    Mnemonic: Object.assign(
      (words: string[]) => actual.Mnemonic(words),
      actual.Mnemonic,
      {
        deriveFrom: (...args: Parameters<typeof actual.Mnemonic.deriveFrom>) =>
          cryptoOverride.words ?? actual.Mnemonic.deriveFrom(...args),
      },
    ),
  };
});

// Frozen v1 outputs from the independent two-salt PRF/HKDF vector.
const words =
  'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
    ' ',
  );
const accountXpub =
  '928f23856ef3f6edc6adc14d7fb39b15cfb985b9bb038755158cf2ad6cdd8281d601bb8f919e2feb0183b1462a59fce5c7acde2cf10ccd10e213d02ff0d0a7a7';
const preprodAddress =
  'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh';
const bitcoinAddress = 'tb1qxfvxchn7jjw9f8arx472apse9aewrv8vkqmr4t';
const ref = {
  credentialId: 'AQID',
  rpId: 'localhost',
  recipeVersion: 'v1' as const,
};

const keySource = (mnemonicWords = words): PasskeyKeySource => ({
  ensureCredential: vi.fn(async () => ref),
  credentialRef: vi.fn(() => ref),
  withPasskeyMnemonic: async use => use(mnemonicWords),
});

const wallet = {
  _loadModules: vi.fn(async () => [
    {
      blockchainName: 'Cardano',
      initializeWallet: async ({
        recoveryPhrase,
        walletId,
      }: {
        recoveryPhrase: string[];
        walletId: string;
      }) => ({
        accounts: [
          {
            accountId: 'cardano-0',
            accountType: 'LazyInMemory',
            blockchainName: 'Cardano',
            networkType: 'testnet',
            blockchainSpecific: {
              accountIndex: 0,
              chainId: Cardano.ChainIds.Preprod,
              extendedAccountPublicKey: await passkeyAccountPublicKey(
                recoveryPhrase,
              ),
            },
            walletId,
          },
        ],
      }),
    },
  ]),
} as unknown as LaceWallet;

describe('passkey Cardano wallet v1', () => {
  it('matches standard Cardano Icarus/CIP-1852 Preprod address', async () => {
    const xpub = await passkeyAccountPublicKey(words);
    expect(xpub).toBe(accountXpub);
    const account = new Bip32Account(
      {
        extendedAccountPublicKey: xpub,
        chainId: Cardano.ChainIds.Preprod,
        accountIndex: 0,
      },
      await Bip32Account.createDefaultDependencies(),
    );
    expect(
      (await account.deriveAddress({ type: AddressType.External, index: 0 }, 0))
        .address,
    ).toBe(preprodAddress);
    const keyAgent = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 0,
      chainId: Cardano.ChainIds.Preprod,
      mnemonicWords: words,
    });
    const signed = await keyAgent.signBlob(
      { role: 0, index: 0 },
      HexBlob('1234'),
    );
    keyAgent.dispose?.();
    expect(signed.publicKey).toBe(
      '1192d1622abc356e0520c303b773dc3d88cb131c6bb8c90d475113fb030c5295',
    );
  });

  it('matches Lace standard Bitcoin BIP-84 testnet path without a Bitcoin SDK module', () => {
    const seed = pbkdf2Sync(words.join(' '), 'mnemonic', 2048, 64, 'sha512');
    const node = HDKey.fromMasterSeed(seed).derive("m/84'/1'/0'/0/0");
    expect(
      bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(node.publicKey!),
        network: bitcoin.networks.testnet,
      }).address,
    ).toBe(bitcoinAddress);
    const laceSeed = deriveBip39Seed(words.join(' '));
    const laceAccount = deriveAccountRootKeyPair({
      seed: laceSeed,
      addressType: BitcoinAddressType.NativeSegWit,
      network: BitcoinNetwork.Testnet,
      account: 0,
    });
    expect(laceAccount.path).toBe("m/84'/1'/0'");
    const lacePaymentKey = deriveChildPublicKey(
      laceAccount.pair.publicKey,
      ChainType.External,
      0,
    );
    expect(lacePaymentKey.toString('hex')).toBe(
      '02da068d4716f5e89eae3679466177ee8e11f79d619c9535e2551341713cc37f66',
    );
    expect(
      deriveAddressByType(
        lacePaymentKey,
        BitcoinAddressType.NativeSegWit,
        bitcoin.networks.testnet,
      ),
    ).toBe(bitcoinAddress);
  });

  it('uses real Cardano integration before exposing the entity', async () => {
    const realWallet = {
      _loadModules: vi.fn(async () => [
        {
          blockchainName: 'Cardano',
          initializeWallet: initializeCardanoWallet,
        },
      ]),
    } as unknown as LaceWallet;
    const { entity } = await createPasskeyWalletEntity(realWallet, {
      keySource: keySource(),
      walletName: 'Preprod',
    });
    expect(entity.accounts.length).toBeGreaterThan(0);
    expect(entity.accounts.map(account => account.networkType)).toContain(
      'mainnet',
    );
    expect(entity.accounts.map(account => account.networkType)).toContain(
      'testnet',
    );
    for (const account of entity.accounts) {
      expect(account.blockchainName).toBe('Cardano');
      expect(
        (account.blockchainSpecific as CardanoBip32AccountProps).chainId
          .networkId,
      ).toBe(
        account.networkType === 'mainnet'
          ? Cardano.NetworkId.Mainnet
          : Cardano.NetworkId.Testnet,
      );
      expect(
        (account.blockchainSpecific as CardanoBip32AccountProps)
          .extendedAccountPublicKey,
      ).toBe(accountXpub);
    }
    expect(JSON.stringify(entity)).not.toMatch(
      /encryptedRootPrivateKey|encryptedRecoveryPhrase|fame coconut/,
    );
  });

  it('derives Cardano only when the wallet also loads Midnight', async () => {
    // The Midnight integration has no passwordless entity and refuses one.
    const midnightInitialize = vi.fn(async () => {
      throw new Error(
        'Midnight in-memory integration does not yet support lazy wallets',
      );
    });
    const withMidnight = {
      _loadModules: vi.fn(async () => [
        {
          blockchainName: 'Cardano',
          initializeWallet: initializeCardanoWallet,
        },
        { blockchainName: 'Midnight', initializeWallet: midnightInitialize },
      ]),
    } as unknown as LaceWallet;
    const { entity } = await createPasskeyWalletEntity(withMidnight, {
      keySource: keySource(),
      walletName: 'Preprod',
    });
    expect(midnightInitialize).not.toHaveBeenCalled();
    expect(
      entity.accounts.every(account => account.blockchainName === 'Cardano'),
    ).toBe(true);
    expect(Object.keys(entity.blockchainSpecific)).not.toContain('Midnight');
  });

  it('returns an integration with only a mainnet account without another assertion', async () => {
    const source = keySource();
    const assertion = vi.spyOn(source, 'withPasskeyMnemonic');
    const mainnetWallet = {
      _loadModules: vi.fn(async () => [
        {
          blockchainName: 'Cardano',
          initializeWallet: async ({ walletId }: { walletId: string }) => ({
            accounts: [
              {
                accountId: 'cardano-mainnet-0',
                accountType: 'LazyInMemory',
                blockchainName: 'Cardano',
                networkType: 'mainnet',
                blockchainSpecific: {
                  accountIndex: 0,
                  chainId: Cardano.ChainIds.Mainnet,
                  extendedAccountPublicKey: accountXpub,
                },
                walletId,
              },
            ],
          }),
        },
      ]),
    } as unknown as LaceWallet;
    const { entity } = await createPasskeyWalletEntity(mainnetWallet, {
      keySource: source,
      walletName: 'Wallet',
    });
    expect(entity.accounts.map(account => account.accountId)).toEqual([
      'cardano-mainnet-0',
    ]);
    expect(assertion).toHaveBeenCalledTimes(1);
  });

  it('reopens with the same public binding and persists no secret', async () => {
    const first = await createPasskeyWalletEntity(wallet, {
      keySource: keySource(),
      walletName: 'Preprod',
    });
    const reopened = await createPasskeyWalletEntity(wallet, {
      keySource: keySource(),
      walletName: 'Preprod',
      expectedBinding: first.binding,
    });
    expect(reopened.binding).toEqual(first.binding);
    expect(reopened.entity.walletId).toBe(WalletId.deriveFromMnemonic(words));
    expect(reopened.entity).toEqual(first.entity);
    expect(JSON.stringify(reopened.entity)).not.toMatch(
      /fame coconut|encryptedRecoveryPhrase|encryptedRootPrivateKey/,
    );
    expect(reopened.entity.type).toBe('LazyInMemory');
  });

  it('recovers the same binding with a discoverable passkey after storage clear', async () => {
    const first = await createPasskeyWalletEntity(wallet, {
      keySource: keySource(),
      walletName: 'Preprod',
    });
    let isDiscovered = false;
    const source = keySource();
    source.credentialRef = () => (isDiscovered ? ref : undefined);
    source.withPasskeyMnemonic = async use => {
      isDiscovered = true;
      return use(words);
    };
    const recovered = await createPasskeyWalletEntity(wallet, {
      keySource: source,
      walletName: 'Preprod',
      expectedBinding: first.binding,
    });
    expect(recovered.binding).toEqual(first.binding);
    expect(recovered.entity.walletId).toBe(first.entity.walletId);
    expect(source.ensureCredential).not.toHaveBeenCalled();
  });

  it('rejects a discovered credential that differs from the saved binding', async () => {
    const source = keySource();
    source.credentialRef = vi
      .fn()
      .mockReturnValueOnce(undefined)
      .mockReturnValue({ ...ref, credentialId: 'other' });
    await expect(
      createPasskeyWalletEntity(wallet, {
        keySource: source,
        walletName: 'Preprod',
        expectedBinding: { ...ref, fingerprint: 'x' },
      }),
    ).rejects.toThrow(PasskeyWalletMismatchError);
  });

  it('can recover again after rejecting a discovered credential', async () => {
    const first = await createPasskeyWalletEntity(wallet, {
      keySource: keySource(),
      walletName: 'Preprod',
    });
    const wrongRawId = Uint8Array.from([4, 5, 6]).buffer;
    const expectedRawId = Uint8Array.from([1, 2, 3]).buffer;
    const selectedIds = [wrongRawId, expectedRawId];
    const get = vi.fn(async (_options?: CredentialRequestOptions) => {
      const rawId = selectedIds.shift();
      if (!rawId) throw new Error('No credential selected');
      return {
        rawId,
        getClientExtensionResults: () => ({
          prf: {
            results: {
              first: Uint8Array.from({ length: 32 }, (_, index) => index + 1),
              second: Uint8Array.from(
                { length: 32 },
                (_, index) => 255 - index,
              ),
            },
          },
        }),
      } as unknown as Credential;
    });
    const source = createPasskeyKeySource({
      rpId: 'localhost',
      credentials: { get } as unknown as CredentialsContainer,
    });

    cryptoOverride.words = words;
    try {
      await expect(
        createPasskeyWalletEntity(wallet, {
          keySource: source,
          walletName: 'Preprod',
          expectedBinding: first.binding,
        }),
      ).rejects.toThrow(PasskeyWalletMismatchError);
      expect(source.credentialRef()).toBeUndefined();

      const recovered = await createPasskeyWalletEntity(wallet, {
        keySource: source,
        walletName: 'Preprod',
        expectedBinding: first.binding,
      });
      expect(recovered.binding).toEqual(first.binding);
      expect(get).toHaveBeenCalledTimes(2);
      for (const [options] of get.mock.calls) {
        expect(options?.publicKey).not.toHaveProperty('allowCredentials');
      }
    } finally {
      cryptoOverride.words = undefined;
    }
  });

  it('refuses another passkey before creating an entity', async () => {
    const first = await createPasskeyWalletEntity(wallet, {
      keySource: keySource(),
      walletName: 'Preprod',
    });
    const other = keySource(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'.split(
        ' ',
      ),
    );
    await expect(
      createPasskeyWalletEntity(wallet, {
        keySource: other,
        walletName: 'Preprod',
        expectedBinding: first.binding,
      }),
    ).rejects.toThrow(PasskeyWalletMismatchError);
  });

  it('rejects a mismatching credential reference without deriving', async () => {
    const source = keySource();
    const assertion = vi.spyOn(source, 'withPasskeyMnemonic');
    await expect(
      createPasskeyWalletEntity(wallet, {
        keySource: source,
        walletName: 'Preprod',
        expectedBinding: { ...ref, credentialId: 'other', fingerprint: 'x' },
      }),
    ).rejects.toThrow(PasskeyWalletMismatchError);
    expect(assertion).not.toHaveBeenCalled();
  });
});
