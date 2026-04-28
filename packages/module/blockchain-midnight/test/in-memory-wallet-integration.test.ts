import { util } from '@cardano-sdk/key-management';
import { AuthSecret } from '@lace-contract/authentication-prompt';
import {
  type MidnightAccountProps,
  MidnightSDKNetworkId,
} from '@lace-contract/midnight-context';
import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { WalletId } from '@lace-contract/wallet-repo';
import { ByteArray } from '@lace-sdk/util';
import { HexBytes } from '@lace-sdk/util';
import { Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import * as MidnightWalledSdkHd from '@midnight-ntwrk/wallet-sdk-hd';
import bip39 from 'bip39';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAccounts,
  initializeWallet,
} from '../src/exported-modules/in-memory-wallet-integration/in-memory-wallet-integration-factory';

import type {
  InitializeInMemoryWalletProps,
  InitializeInMemoryWalletResult,
} from '@lace-contract/in-memory';
import type { RolesMap } from '@lace-contract/midnight-context';

vi.mock('@cardano-sdk/key-management', async () => {
  const actual = await vi.importActual('@cardano-sdk/key-management');
  return {
    ...actual,
    emip3encrypt: vi.fn().mockImplementation((data: Buffer) => data),
    emip3decrypt: vi.fn().mockImplementation((data: Buffer) => data),
  };
});

const { mnemonic, password } = stubData;
const recoveryPhrase = mnemonic.split(' ');
const encryptedSeed = HexBytes(
  'a51c86de32d0791f7cffc3bdff1abd9bb54987f0ed5effc30c936dddbb9afd9d530c8db445e4f2d3ea42a321b260e022aadf05987c9a67ec7b6b6ca1d0593ec9',
);

describe('blockchain-midnight', () => {
  const walletId = WalletId('wallet-id');
  const walletName = 'test-wallet';

  describe('initializeWallet', () => {
    const selectAccountMock = vi.fn();
    const selectRoleMock = vi.fn();
    const deriveKeyAtMock = vi.fn();
    const derivedZswapKey = ByteArray.fromUTF8('zswap key');
    const derivedNightExternalKey = ByteArray.fromUTF8('night external key');
    const seed = Buffer.from(ByteArray.fromUTF8('seed'));
    let capturedSeed!: Buffer;

    let wallet: InitializeInMemoryWalletResult<MidnightAccountProps>;

    beforeEach(async () => {
      vi.spyOn(bip39, 'mnemonicToSeed').mockImplementation(async () =>
        Promise.resolve(Buffer.from(seed)),
      );
      vi.spyOn(MidnightWalledSdkHd.HDWallet, 'fromSeed').mockImplementation(
        (buf: Uint8Array) => {
          capturedSeed = Buffer.from(buf);
          return {
            type: 'seedOk',
            hdWallet: {
              selectAccount: selectAccountMock.mockReturnValue({
                selectRole: selectRoleMock.mockImplementation(
                  (role: RolesMap[keyof RolesMap]) => {
                    const derivedKey =
                      role === Roles.Zswap
                        ? derivedZswapKey
                        : derivedNightExternalKey;

                    return {
                      deriveKeyAt: deriveKeyAtMock.mockReturnValue({
                        type: 'keyDerived',
                        key: derivedKey,
                      }),
                    };
                  },
                ),
              }),
            } as unknown as MidnightWalledSdkHd.HDWallet,
          };
        },
      );

      wallet = await initializeWallet(
        {
          recoveryPhrase,
          walletId,
          password: Buffer.from(password, 'utf8'),
          walletName,
          order: 0,
        } satisfies InitializeInMemoryWalletProps,
        {
          logger: dummyLogger,
        },
      );
    });

    it('can create a valid midnight in memory wallet', async () => {
      expect(wallet.accounts).toHaveLength(MidnightSDKNetworkId.length); // One account for each network
      expect(wallet.blockchainSpecificWalletData).toEqual({
        encryptedSeed: expect.any(String) as HexBytes,
      });

      // Verify each account has the correct structure
      wallet.accounts.forEach(account => {
        expect(account).toMatchObject({
          blockchainName: 'Midnight',
          accountType: 'InMemory',
          walletId,
          metadata: { name: 'Midnight #0' },
        });
        expect(
          account.blockchainSpecific.nightExternalKey.encryptedKey,
        ).toBeDefined();
        expect(account.blockchainSpecific.zswapKey.encryptedKey).toBeDefined();
        expect(account.blockchainSpecific.dustKey.encryptedKey).toBeDefined();
      });
    });

    it('converts mnemonic to seed', () => {
      expect(bip39.mnemonicToSeed).toHaveBeenCalledWith(
        util.joinMnemonicWords(recoveryPhrase),
      );
    });

    it('derives zswap key at: account 0, role zswap, index 0', () => {
      // fromSeed is now called 5 times, once for each network
      expect(MidnightWalledSdkHd.HDWallet.fromSeed).toHaveBeenCalledTimes(
        MidnightSDKNetworkId.length,
      );
      expect(Buffer.compare(capturedSeed, Buffer.from('seed', 'utf8'))).toBe(0);
      expect(selectAccountMock).toHaveBeenCalledWith(0);
      expect(selectRoleMock).toHaveBeenCalledWith(
        MidnightWalledSdkHd.Roles.Zswap,
      );
      expect(deriveKeyAtMock).toHaveBeenCalledWith(0);
    });
  });

  it('initializeWallet derives correct keys', async () => {
    const wallet = await initializeWallet(
      {
        recoveryPhrase,
        walletId,
        password: Buffer.from(password, 'utf8'),
        walletName,
        order: 0,
      } satisfies InitializeInMemoryWalletProps,
      {
        logger: dummyLogger,
      },
    );

    // Wallet now creates accounts for all supported networks
    expect(wallet.accounts).toHaveLength(MidnightSDKNetworkId.length);

    // Verify keys are derived correctly for all accounts
    wallet.accounts.forEach(account => {
      expect(
        account.blockchainSpecific.zswapKey.encryptedKey,
      ).toMatchInlineSnapshot(`"7a73776170206b6579"`);
      expect(
        account.blockchainSpecific.nightExternalKey.encryptedKey,
      ).toMatchInlineSnapshot(`"6e696768742065787465726e616c206b6579"`);
    });

    expect(
      wallet.blockchainSpecificWalletData?.encryptedSeed,
    ).toMatchInlineSnapshot(`"73656564"`);
  });

  it('createAccounts derives correct keys', async () => {
    const accounts = await createAccounts(
      {
        password: AuthSecret.fromUTF8(password),
        walletId,
        blockchainSpecific: { encryptedSeed },
        accountIndex: 0,
        blockchainName: 'Midnight',
      },
      {
        logger: dummyLogger,
      },
    );

    // createAccounts now creates accounts for all supported networks
    expect(accounts).toHaveLength(MidnightSDKNetworkId.length);

    // Verify keys are derived correctly for all accounts
    accounts.forEach(account => {
      expect(
        account.blockchainSpecific.zswapKey.encryptedKey,
      ).toMatchInlineSnapshot(`"7a73776170206b6579"`);
      expect(
        account.blockchainSpecific.nightExternalKey.encryptedKey,
      ).toMatchInlineSnapshot(`"6e696768742065787465726e616c206b6579"`);
    });
  });
});
