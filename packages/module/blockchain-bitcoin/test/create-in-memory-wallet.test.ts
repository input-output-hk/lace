import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  BitcoinAccountId,
  type BitcoinBip32AccountProps,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { WalletId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import {
  createAccounts,
  initializeWallet,
} from '../src/in-memory-wallet-integration';

import type { BitcoinSpecificInMemoryWalletData } from '@lace-contract/bitcoin-context';
import type {
  CreateInMemoryAccountResult,
  InitializeInMemoryWalletResult,
} from '@lace-contract/in-memory';

const password = 'some_password';
const encryptedRootPrivateKey = HexBytes(
  '6eccbf776a48a4612b0d6935013d50dde9b0f9732b45a6f8a0a10c4dd645cde62e44345dcad0df3f2e2d2271b2d9dddf32b7e8123244df34c716af900137f8232d39d4523f3a4a3e3019ae0e726c1373474e1703554d2b8e50849890656eaa3ff6ba85a8c10093c2369cb346a735985434a148f763a41d10f6af124a',
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
describe('blockchain-bitcoin', () => {
  describe('createInMemoryWallet', () => {
    it('can create a valid bitcoin in memory wallet', async () => {
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
          BitcoinBip32AccountProps,
          BitcoinSpecificInMemoryWalletData
        >
      >({
        accounts: [
          {
            blockchainName: 'Bitcoin',
            blockchainSpecific: {
              accountIndex: 0,
              extendedAccountPublicKeys: {
                legacy:
                  'xpub6DUYViQ3hAEt4NqMnAYsGHWNkK3xJQCNGamsqxvs29KMS6m4p5FfW729XrY7G6x3SSRtmNSv8PreLXGyxL8v51b9B1C25X9FMx7ZiTME6Wd',
                segWit:
                  'xpub6DDkzEtnL6kCn7SFA8WtrhqbZiLAFrwuJt2RhaEhqqBgPisgShKuhLqCsf1oqU3F7sg8mrhHH3H9E4fw5UGJqodmfUjuBGjR5LigYAaMue8',
                nativeSegWit:
                  'xpub6D6iVRqEpdW2Xr8p4aDf5A1kdjJAvSpSV7FY36GpjF3ybci3epuzvRiKyCG8uiBiepqnrmjWJaAss8UUEmu3Ti6Po5QJJmxJZKAFUcrjzUS',
                taproot:
                  'xpub6Br3nT6tDyKRbx9MSUudKzha1ZZxy7BH5P9YgDADJGeZqkViyDx33NR84d8oidkpEUxCo2fyQ1WrezofdeKmntAgJuWzvfbFNb8XKTi2s54',
                electrumNativeSegWit:
                  'xpub6CBMUK6f1kHkHuqnW3Dq5L6LY45uQ4Z3Rp3FMjmwgKoJm5TCLSkT9CuRQWPurAcLU8p8frx2btQxJR3U3A3Qiu4aFE9ZnuX5RybY7uqaPdb',
              },
            },
            metadata: {
              name: 'Bitcoin #0',
            },
            accountId: BitcoinAccountId(walletId, 0, BitcoinNetwork.Mainnet),
            accountType: 'InMemory',
            networkType: 'mainnet',
            blockchainNetworkId: BitcoinNetworkId('mainnet'),
            walletId,
          },
          {
            blockchainName: 'Bitcoin',
            blockchainSpecific: {
              accountIndex: 0,
              extendedAccountPublicKeys: {
                legacy:
                  'xpub6DND2yrdnkmRrFiQFMFG8SbtkUEoFFH8RzHGD1m8RtPiA8FWFsEvYXoQKKav69Nu4ZrdfEaJrmfUa3Q51wSmhLVz5BnLBmQgJrG6fo1VD4Q',
                segWit:
                  'xpub6D62cP9gHDao5o3S5jLrgb1KkTaKuFmkphtFwa1K13KWU95kmgGsnmQb7dXTn6qxauAwNXYTXWUc7atogxffsZT8T2QcBi1gxXBg2JuoWjo',
                nativeSegWit:
                  'xpub6CTkaGL7rFuS3iRzZAJvPGgdWwmRuvdUn1DAkkJLKwVGsDrchN2JgEKdvsZ5BXXeEumkLLU1TSqoaZYBpDRGgDhdAmUMBebd4JETJLpeFcN',
                taproot:
                  'xpub6CVn6B8AxQFEqoTYSStLgmvosMgAKp2qCdNudKpm6bBssoWsJDAX73cBGfXHKAc9twc8LuH6DBqMw3XKeU3VyjSYnQhJXhPnFDEw7fDYrsB',
                electrumNativeSegWit:
                  'xpub6CC9UfdP3FecuyQhaRNUf488cukmELm1SLW2BQDJwP5kxLqZ2JWcuH9CswC4x2CTPNLBMeXCFSN7TmyJyHYHMgZR156WqYfDwi5E4yE7Zis',
              },
            },
            metadata: {
              name: 'Bitcoin #0',
            },
            accountId: BitcoinAccountId(walletId, 0, BitcoinNetwork.Testnet),
            accountType: 'InMemory',
            networkType: 'testnet',
            blockchainNetworkId: BitcoinNetworkId('testnet4'),
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
    it('can create a valid bitcoin in memory wallet account', async () => {
      const walletId = WalletId('walletid');
      const accounts = await createAccounts(
        {
          password: AuthSecret.fromUTF8(password),
          walletId,
          blockchainSpecific: { encryptedRootPrivateKey },
          accountIndex: 0,
          blockchainName: 'Bitcoin',
        },
        {
          logger: dummyLogger,
        },
      );

      expect(accounts[1]).toMatchObject<
        CreateInMemoryAccountResult<BitcoinBip32AccountProps>[number]
      >({
        blockchainSpecific: {
          accountIndex: 0,
          extendedAccountPublicKeys: {
            legacy:
              'xpub6DND2yrdnkmRrFiQFMFG8SbtkUEoFFH8RzHGD1m8RtPiA8FWFsEvYXoQKKav69Nu4ZrdfEaJrmfUa3Q51wSmhLVz5BnLBmQgJrG6fo1VD4Q',
            segWit:
              'xpub6D62cP9gHDao5o3S5jLrgb1KkTaKuFmkphtFwa1K13KWU95kmgGsnmQb7dXTn6qxauAwNXYTXWUc7atogxffsZT8T2QcBi1gxXBg2JuoWjo',
            nativeSegWit:
              'xpub6CTkaGL7rFuS3iRzZAJvPGgdWwmRuvdUn1DAkkJLKwVGsDrchN2JgEKdvsZ5BXXeEumkLLU1TSqoaZYBpDRGgDhdAmUMBebd4JETJLpeFcN',
            taproot:
              'xpub6CVn6B8AxQFEqoTYSStLgmvosMgAKp2qCdNudKpm6bBssoWsJDAX73cBGfXHKAc9twc8LuH6DBqMw3XKeU3VyjSYnQhJXhPnFDEw7fDYrsB',
            electrumNativeSegWit:
              'xpub6CC9UfdP3FecuyQhaRNUf488cukmELm1SLW2BQDJwP5kxLqZ2JWcuH9CswC4x2CTPNLBMeXCFSN7TmyJyHYHMgZR156WqYfDwi5E4yE7Zis',
          },
        },
        metadata: {
          name: 'Bitcoin #0',
        },
        accountId: BitcoinAccountId(walletId, 0, BitcoinNetwork.Testnet),
        accountType: 'InMemory',
        networkType: 'testnet',
        blockchainNetworkId: BitcoinNetworkId('testnet4'),
        walletId,
        blockchainName: 'Bitcoin',
      });
    });
  });
});
