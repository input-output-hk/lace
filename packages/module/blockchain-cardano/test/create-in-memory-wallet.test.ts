import { Cardano } from '@cardano-sdk/core';
import { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  CardanoAccountId,
  CardanoNetworkId,
  type CardanoBip32AccountProps,
} from '@lace-contract/cardano-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import {
  initializeWallet,
  createAccounts,
} from '../src/in-memory-wallet-integration';

import type { CardanoSpecificInMemoryWalletData } from '@lace-contract/cardano-context';
import type {
  CreateInMemoryAccountResult,
  InitializeInMemoryWalletResult,
} from '@lace-contract/in-memory';

const password = 'some_password';
const encryptedRootPrivateKey = HexBytes(
  '6a3eed93aca285f1871a09299abf5e78588e8fbceba7ca7fbd2a57b442d8b2acf42467c0d5d94ebc304aa0c10f8432b042d9f6df2015e1f4640ef4b8c6b1a0cc391f8c634c0b21a69c189e6a9b8f6a03b01ae78cb1e472a7f2cebb3820445aec75542178caad6a0e9a1e0838d38f7c7032fcbd0997244816c5d9e949e733b87110e1f87e89e9f9e50e59c5fa6723ca7eb895dcbfbe9d75ef51b4ae72',
);
const recoveryPhrase = [
  'vacant',
  'violin',
  'soft',
  'weird',
  'deliver',
  'render',
  'brief',
  'always',
  'monitor',
  'general',
  'maid',
  'smart',
  'jelly',
  'core',
  'drastic',
  'erode',
  'echo',
  'there',
  'clump',
  'dizzy',
  'card',
  'filter',
  'option',
  'defense',
];
describe('blockchain-cardano', () => {
  describe('createInMemoryWallet', () => {
    it('can create a valid cardano in memory wallet', async () => {
      const walletId = WalletId('walletid');
      const walletName = 'test-wallet';
      const walletOrder = 0;
      const wallet = await initializeWallet(
        {
          recoveryPhrase,
          password: AuthSecret.fromUTF8(password),
          walletName,
          order: walletOrder,
          walletId,
        },
        {
          logger: dummyLogger,
        },
      );

      expect(wallet).toMatchObject<
        InitializeInMemoryWalletResult<
          CardanoBip32AccountProps,
          CardanoSpecificInMemoryWalletData
        >
      >({
        accounts: [
          {
            blockchainName: 'Cardano',
            blockchainSpecific: {
              accountIndex: 0,
              extendedAccountPublicKey: Bip32PublicKeyHex(
                'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf',
              ),
              chainId: Cardano.ChainIds.Mainnet,
            },
            metadata: {
              name: 'Cardano #0',
            },
            accountId: CardanoAccountId(
              walletId,
              0,
              Cardano.NetworkMagics.Mainnet,
            ),
            accountType: 'InMemory',
            networkType: 'mainnet',
            blockchainNetworkId: CardanoNetworkId(
              Cardano.NetworkMagics.Mainnet,
            ),
            walletId,
          },
          {
            blockchainName: 'Cardano',
            blockchainSpecific: {
              accountIndex: 0,
              extendedAccountPublicKey: Bip32PublicKeyHex(
                'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf',
              ),
              chainId: Cardano.ChainIds.Preprod,
            },
            metadata: {
              name: 'Cardano #0',
            },
            accountId: CardanoAccountId(
              walletId,
              0,
              Cardano.ChainIds.Preprod.networkMagic,
            ),
            accountType: 'InMemory',
            networkType: 'testnet',
            blockchainNetworkId: CardanoNetworkId(
              Cardano.ChainIds.Preprod.networkMagic,
            ),
            walletId,
          },
          {
            blockchainName: 'Cardano',
            blockchainSpecific: {
              accountIndex: 0,
              extendedAccountPublicKey: Bip32PublicKeyHex(
                'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf',
              ),
              chainId: Cardano.ChainIds.Preview,
            },
            metadata: {
              name: 'Cardano #0',
            },
            accountId: CardanoAccountId(
              walletId,
              0,
              Cardano.ChainIds.Preview.networkMagic,
            ),
            accountType: 'InMemory',
            networkType: 'testnet',
            blockchainNetworkId: CardanoNetworkId(
              Cardano.ChainIds.Preview.networkMagic,
            ),
            walletId,
          },
        ],
        blockchainSpecificWalletData: {
          encryptedRootPrivateKey: expect.any(String) as HexBytes,
        },
      });
    });
  });

  describe('createInMemoryWalletAccount', () => {
    it('can create a valid cardano in memory wallet account', async () => {
      const walletId = WalletId('walletid');
      const accounts = await createAccounts(
        {
          password: AuthSecret.fromUTF8(password),
          walletId,
          blockchainSpecific: { encryptedRootPrivateKey },
          accountIndex: 0,
          blockchainName: 'Cardano',
        },
        {
          logger: dummyLogger,
        },
      );

      expect(accounts[0]).toMatchObject<
        CreateInMemoryAccountResult<CardanoBip32AccountProps>[number]
      >({
        blockchainName: 'Cardano',
        blockchainSpecific: {
          accountIndex: 0,
          extendedAccountPublicKey: Bip32PublicKeyHex(
            'a79619cd18f11202741213ab003dd40bffb2a31e8ad1bc5aab6f02be3c8aa9218d515cb54181fb2f5fc3af329e80949c082fb52f7b07e359bd7835a6762148bf',
          ),
          chainId: Cardano.ChainIds.Mainnet,
        },
        metadata: {
          name: 'Cardano #0',
        },
        accountId: CardanoAccountId(walletId, 0, Cardano.NetworkMagics.Mainnet),
        accountType: 'InMemory',
        networkType: 'mainnet',
        blockchainNetworkId: CardanoNetworkId(Cardano.NetworkMagics.Mainnet),
        walletId,
      });
    });
  });
});
