import {
  BitcoinAccountId,
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import {
  CardanoAccountId,
  CardanoNetworkId,
} from '@lace-contract/cardano-context';
import {
  MidnightAccountId,
  MidnightNetworkId,
} from '@lace-contract/midnight-context';
import {
  WalletId,
  WalletType,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { testSideEffect } from '@lace-lib/util-dev';
import { BehaviorSubject, NEVER, tap } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  diffWallets,
  hydrateWalletRepo,
  walletInfoToShellEntity,
} from '../src/store/side-effects/wallet-repo-hydrator';
import { syncWalletsRequested } from '../src/store/slice';

import type { Cardano } from '@cardano-sdk/core';
import type { CardanoBip32AccountProps } from '@lace-contract/cardano-context';
import type { AnyWallet } from '@lace-contract/wallet-repo';
import type { LaceResult, WalletInfo } from '@lace-lib/extension-shell-api';

// Any non-empty hex works: the projection stores the xpub verbatim, it derives
// nothing (address discovery is a separate host call).
const FAKE_XPUB = 'ab'.repeat(64);
const FAKE_XPUB_1 = 'cd'.repeat(64);
const PREPROD_MAGIC = 1 as Cardano.NetworkMagic;
const MAINNET_MAGIC = 764_824_073 as Cardano.NetworkMagic;
const BTC_NATIVE_SEGWIT_XPUB = 'xpubBtcNativeSegWit';
const BTC_TAPROOT_XPUB = 'xpubBtcTaproot';

type WireAccount = WalletInfo['cardanoAccounts'][number];
type WireBitcoinAccount = WalletInfo['bitcoinAccounts'][number];
type WireMidnightAccount = NonNullable<WalletInfo['midnightAccounts']>[number];

const account = (over: Partial<WireAccount> = {}): WireAccount => ({
  accountIndex: 0,
  xpub: FAKE_XPUB,
  networkMagic: PREPROD_MAGIC,
  networkId: 0,
  name: 'Account 1',
  ...over,
});

const bitcoinAccount = (
  over: Partial<WireBitcoinAccount> = {},
): WireBitcoinAccount => ({
  accountIndex: 0,
  network: 'mainnet',
  xpubs: { nativeSegWit: BTC_NATIVE_SEGWIT_XPUB, taproot: BTC_TAPROOT_XPUB },
  name: 'Bitcoin #0',
  ...over,
});

const midnightAccount = (
  over: Partial<WireMidnightAccount> = {},
): WireMidnightAccount => ({
  accountIndex: 0,
  networkId: 'preview',
  shieldedAddress: 'mn_shield_test1qshielded',
  unshieldedAddress: 'mn_addr_test1qunshielded',
  dustAddress: 'mn_dust_test1qdust',
  name: 'Midnight #0',
  publicKeys: { coinPublicKey: 'aa11', encryptionPublicKey: 'bb22' },
  ...over,
});

// A shell account's `blockchainSpecific` is the Cardano|Bitcoin union; these
// assertions target Cardano accounts, so narrow to the Cardano props.
const cardanoSpecific = (account?: {
  blockchainSpecific: unknown;
}): CardanoBip32AccountProps | undefined =>
  account?.blockchainSpecific as CardanoBip32AccountProps | undefined;

describe('cardano-host-pull wallet-repo hydrator', () => {
  const info = (over: Partial<WalletInfo> = {}): WalletInfo => ({
    walletId: 'w1',
    name: 'Wallet 1',
    cardanoAccounts: [account()],
    bitcoinAccounts: [],
    order: 0,
    type: 'InMemory',
    ...over,
  });

  const shell = (over: Partial<WalletInfo> = {}) => {
    const result = walletInfoToShellEntity(info(over));
    if (!result) throw new Error('expected a shell');
    return result;
  };

  describe('walletInfoToShellEntity', () => {
    it('projects an InMemory wallet into a secret-free shell', () => {
      const result = walletInfoToShellEntity(info());

      expect(result).toBeDefined();
      expect(result?.type).toBe(WalletType.InMemory);
      expect(
        result?.type === WalletType.InMemory && result.isPassphraseConfirmed,
      ).toBe(true);
      expect(result?.metadata).toEqual({ name: 'Wallet 1', order: 0 });

      const account0 = result?.accounts[0];
      expect(account0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(account0?.blockchainName).toBe('Cardano');
      expect(account0?.accountType).toBe('InMemory');
      expect(account0?.networkType).toBe('testnet');
      expect(account0?.blockchainNetworkId).toBe(
        CardanoNetworkId(PREPROD_MAGIC),
      );
      expect(account0?.metadata.name).toBe('Account 1');
      expect(cardanoSpecific(account0)?.extendedAccountPublicKey).toBe(
        FAKE_XPUB,
      );
      expect(cardanoSpecific(account0)?.accountIndex).toBe(0);
      expect(cardanoSpecific(account0)?.chainId).toEqual({
        networkId: 0,
        networkMagic: PREPROD_MAGIC,
      });
    });

    it('projects EVERY account, each with its OWN network (multi-account, multi-network)', () => {
      const result = walletInfoToShellEntity(
        info({
          cardanoAccounts: [
            account({ accountIndex: 0, name: 'Preprod #1' }),
            account({
              accountIndex: 1,
              xpub: FAKE_XPUB_1,
              name: 'Preprod #2',
            }),
            account({
              accountIndex: 0,
              networkMagic: MAINNET_MAGIC,
              networkId: 1,
              name: 'Mainnet #1',
            }),
          ],
        }),
      );

      expect(result?.accounts).toHaveLength(3);
      const preprod0 = result?.accounts[0];
      const preprod1 = result?.accounts[1];
      const mainnet0 = result?.accounts[2];
      expect(preprod0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(preprod1?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 1, PREPROD_MAGIC),
      );
      expect(mainnet0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, MAINNET_MAGIC),
      );
      // Each account derives its own network from the wire, not a shared one.
      expect(preprod0?.networkType).toBe('testnet');
      expect(mainnet0?.networkType).toBe('mainnet');
      expect(mainnet0?.blockchainNetworkId).toBe(
        CardanoNetworkId(MAINNET_MAGIC),
      );
      expect(cardanoSpecific(mainnet0)?.chainId).toEqual({
        networkId: 1,
        networkMagic: MAINNET_MAGIC,
      });
    });

    it('projects PUBLIC data only — no secret anywhere in the shell', () => {
      const result = walletInfoToShellEntity(info());

      expect(result && 'encryptedRecoveryPhrase' in result).toBe(false);
      expect(result?.blockchainSpecific).toEqual({});
      expect(JSON.stringify(result).toLowerCase()).not.toContain('encrypted');
    });

    it('skips a non-projected wallet type (Script / MultiSig)', () => {
      expect(walletInfoToShellEntity(info({ type: 'Script' }))).toBeUndefined();
      expect(
        walletInfoToShellEntity(info({ type: 'MultiSig' })),
      ).toBeUndefined();
    });

    it('projects a LazyInMemory wallet read-only across every chain', () => {
      const result = walletInfoToShellEntity(
        info({
          type: 'LazyInMemory',
          cardanoAccounts: [account()],
          bitcoinAccounts: [bitcoinAccount()],
          midnightAccounts: [midnightAccount()],
        }),
      );

      expect(result?.type).toBe(WalletType.LazyInMemory);
      expect(result?.metadata).toEqual({ name: 'Wallet 1', order: 0 });
      // Every chain's account survives with the SAME id and public material the
      // InMemory projection produces — only the accountType marks it lazy.
      expect(result?.accounts.map(a => a.accountId)).toEqual([
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Mainnet),
        MidnightAccountId(WalletId('w1'), 0, 'preview'),
      ]);
      expect(result?.accounts.map(a => a.accountType)).toEqual([
        'LazyInMemory',
        'LazyInMemory',
        'LazyInMemory',
      ]);
      expect(
        cardanoSpecific(result?.accounts[0])?.extendedAccountPublicKey,
      ).toBe(FAKE_XPUB);
    });

    it('projects a LazyInMemory wallet with NO secret and no passphrase claim', () => {
      const result = walletInfoToShellEntity(info({ type: 'LazyInMemory' }));

      // Lace persists no seed for a lazy wallet, so there is nothing to confirm
      // and nothing sealed to leak.
      expect(result && 'isPassphraseConfirmed' in result).toBe(false);
      expect(result && 'encryptedRecoveryPhrase' in result).toBe(false);
      expect(result?.blockchainSpecific).toEqual({});
      expect(JSON.stringify(result).toLowerCase()).not.toContain('encrypted');
    });

    it('skips a LazyInMemory wallet with no accounts on any chain', () => {
      expect(
        walletInfoToShellEntity(
          info({
            type: 'LazyInMemory',
            cardanoAccounts: [],
            bitcoinAccounts: [],
          }),
        ),
      ).toBeUndefined();
    });

    it('skips a wallet with no accounts on either chain', () => {
      expect(
        walletInfoToShellEntity(
          info({ cardanoAccounts: [], bitcoinAccounts: [] }),
        ),
      ).toBeUndefined();
    });

    it('projects Bitcoin accounts with the monolith account id + shape', () => {
      const result = walletInfoToShellEntity(
        info({
          cardanoAccounts: [],
          bitcoinAccounts: [
            bitcoinAccount({ accountIndex: 0, network: 'mainnet' }),
            bitcoinAccount({
              accountIndex: 0,
              network: 'testnet4',
              name: 'Bitcoin #0 (testnet4)',
            }),
          ],
        }),
      );

      expect(result?.accounts).toHaveLength(2);
      const [mainnet, testnet4] = result!.accounts;
      // network rides the wire because (walletId, accountIndex) is not unique
      // for Bitcoin — both network accounts share index 0.
      expect(mainnet?.accountId).toBe(
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Mainnet),
      );
      expect(testnet4?.accountId).toBe(
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Testnet),
      );
      expect(mainnet?.blockchainName).toBe('Bitcoin');
      expect(mainnet?.accountType).toBe('InMemory');
      expect(mainnet?.networkType).toBe('mainnet');
      expect(testnet4?.networkType).toBe('testnet');
      expect(mainnet?.blockchainNetworkId).toBe(BitcoinNetworkId('mainnet'));
      expect(testnet4?.blockchainNetworkId).toBe(BitcoinNetworkId('testnet4'));
      expect(mainnet?.metadata.name).toBe('Bitcoin #0');
      expect(mainnet?.blockchainSpecific).toEqual({
        accountIndex: 0,
        extendedAccountPublicKeys: {
          nativeSegWit: BTC_NATIVE_SEGWIT_XPUB,
          taproot: BTC_TAPROOT_XPUB,
        },
        networkId: BitcoinNetworkId('mainnet'),
      });
    });

    it('projects Midnight accounts (engine-computed publics) with the monolith account id', () => {
      const result = walletInfoToShellEntity(
        info({
          cardanoAccounts: [],
          midnightAccounts: [midnightAccount()],
        }),
      );

      expect(result?.accounts).toHaveLength(1);
      const midnight = result?.accounts[0];
      expect(midnight?.accountId).toBe(
        MidnightAccountId(WalletId('w1'), 0, 'preview'),
      );
      expect(midnight?.blockchainName).toBe('Midnight');
      expect(midnight?.accountType).toBe('InMemory');
      expect(midnight?.networkType).toBe('testnet');
      expect(midnight?.blockchainNetworkId).toBe(MidnightNetworkId('preview'));
      expect(midnight?.metadata.name).toBe('Midnight #0');
      expect(midnight?.blockchainSpecific).toEqual({
        accountIndex: 0,
        networkId: 'preview',
        shieldedAddress: 'mn_shield_test1qshielded',
        unshieldedAddress: 'mn_addr_test1qunshielded',
        dustAddress: 'mn_dust_test1qdust',
        publicKeys: { coinPublicKey: 'aa11', encryptionPublicKey: 'bb22' },
      });
    });

    it('falls back to the wallet name for a Midnight account served without one', () => {
      const nameless = midnightAccount();
      delete nameless.name;
      const result = walletInfoToShellEntity(
        info({ cardanoAccounts: [], midnightAccounts: [nameless] }),
      );

      expect(result?.accounts[0]?.metadata.name).toBe('Wallet 1');
    });

    it('projects no Midnight account while the wire entry is absent (publics not yet computed)', () => {
      const result = walletInfoToShellEntity(info());
      expect(result?.accounts.some(a => a.blockchainName === 'Midnight')).toBe(
        false,
      );
    });

    it('projects a wallet that holds BOTH chains', () => {
      const result = walletInfoToShellEntity(
        info({
          cardanoAccounts: [account()],
          bitcoinAccounts: [bitcoinAccount()],
        }),
      );

      expect(result?.accounts).toHaveLength(2);
      expect(result?.accounts[0]?.blockchainName).toBe('Cardano');
      expect(result?.accounts[0]?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(result?.accounts[1]?.blockchainName).toBe('Bitcoin');
      expect(result?.accounts[1]?.accountId).toBe(
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Mainnet),
      );
    });

    // A host-paired Ledger wallet projects as a watch-only shell (ADR 44): the
    // same public Cardano material, but marked HardwareLedger so the guest
    // routes signing through the host device ceremony.
    const ledgerShell = (over: Partial<WalletInfo> = {}) => {
      const result = walletInfoToShellEntity(
        info({ type: 'HardwareLedger', ...over }),
      );
      if (!result || result.type !== WalletType.HardwareLedger) {
        throw new Error('expected a HardwareLedger shell');
      }
      return result;
    };

    it('projects a HardwareLedger wallet as a watch-only Cardano shell', () => {
      const result = ledgerShell();

      expect(result.type).toBe(WalletType.HardwareLedger);
      expect(result.metadata).toEqual({ name: 'Wallet 1', order: 0 });

      const account0 = result.accounts[0];
      expect(account0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(account0?.blockchainName).toBe('Cardano');
      expect(account0?.accountType).toBe('HardwareLedger');
      expect(account0?.networkType).toBe('testnet');
      expect(account0?.blockchainNetworkId).toBe(
        CardanoNetworkId(PREPROD_MAGIC),
      );
      expect(account0?.metadata.name).toBe('Account 1');
      expect(cardanoSpecific(account0)?.extendedAccountPublicKey).toBe(
        FAKE_XPUB,
      );
      expect(cardanoSpecific(account0)?.accountIndex).toBe(0);
      expect(cardanoSpecific(account0)?.chainId).toEqual({
        networkId: 0,
        networkMagic: PREPROD_MAGIC,
      });
      // The Ledger projection additionally carries networkId (monolith shape).
      expect(cardanoSpecific(account0)?.networkId).toBe(
        CardanoNetworkId(PREPROD_MAGIC),
      );
    });

    it('projects EVERY HardwareLedger account, each with its OWN network', () => {
      const result = ledgerShell({
        cardanoAccounts: [
          account({ accountIndex: 0, name: 'Preprod #1' }),
          account({ accountIndex: 1, xpub: FAKE_XPUB_1, name: 'Preprod #2' }),
          account({
            accountIndex: 0,
            networkMagic: MAINNET_MAGIC,
            networkId: 1,
            name: 'Mainnet #1',
          }),
        ],
      });

      expect(result.accounts).toHaveLength(3);
      expect(
        result.accounts.every(a => a.accountType === 'HardwareLedger'),
      ).toBe(true);
      const [preprod0, preprod1, mainnet0] = result.accounts;
      expect(preprod0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(preprod1?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 1, PREPROD_MAGIC),
      );
      expect(mainnet0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, MAINNET_MAGIC),
      );
      expect(preprod0?.networkType).toBe('testnet');
      expect(mainnet0?.networkType).toBe('mainnet');
      expect(mainnet0?.blockchainNetworkId).toBe(
        CardanoNetworkId(MAINNET_MAGIC),
      );
    });

    it('projects a HardwareLedger wallet with NO secret material', () => {
      const result = ledgerShell();

      expect('encryptedRecoveryPhrase' in result).toBe(false);
      expect(result.blockchainSpecific).toEqual({});
      expect(JSON.stringify(result).toLowerCase()).not.toContain('encrypted');
    });

    it('skips a HardwareLedger wallet with no Cardano accounts', () => {
      expect(
        walletInfoToShellEntity(
          info({ type: 'HardwareLedger', cardanoAccounts: [] }),
        ),
      ).toBeUndefined();
    });

    it('projects a HardwareLedger wallet with BOTH Cardano and watch-only Bitcoin accounts', () => {
      const result = ledgerShell({
        cardanoAccounts: [account()],
        bitcoinAccounts: [
          bitcoinAccount({
            accountIndex: 0,
            network: 'mainnet',
            masterFingerprint: 'deadbeef',
          }),
        ],
      });

      expect(result.accounts).toHaveLength(2);
      const [cardano, bitcoin] = result.accounts;
      expect(cardano?.blockchainName).toBe('Cardano');
      expect(cardano?.accountType).toBe('HardwareLedger');
      expect(bitcoin?.blockchainName).toBe('Bitcoin');
      expect(bitcoin?.accountType).toBe('HardwareLedger');
      expect(bitcoin?.accountId).toBe(
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Mainnet),
      );
      expect(bitcoin?.networkType).toBe('mainnet');
      expect(bitcoin?.blockchainNetworkId).toBe(BitcoinNetworkId('mainnet'));
      expect(bitcoin?.metadata.name).toBe('Bitcoin #0');
      // The watch-only Ledger shape: nativeSegWit-only (the wire's extra xpubs —
      // e.g. taproot — are dropped) plus the device fingerprint, matching the
      // monolith BitcoinBip32AccountProps a Ledger export produces (ADR 44).
      expect(bitcoin?.blockchainSpecific).toEqual({
        accountIndex: 0,
        extendedAccountPublicKeys: { nativeSegWit: BTC_NATIVE_SEGWIT_XPUB },
        networkId: BitcoinNetworkId('mainnet'),
        masterFingerprint: 'deadbeef',
      });
    });

    it('omits masterFingerprint from a HardwareLedger Bitcoin account when the wire carries none', () => {
      const result = ledgerShell({
        cardanoAccounts: [account()],
        bitcoinAccounts: [bitcoinAccount({ accountIndex: 0 })],
      });

      const bitcoin = result.accounts.find(a => a.blockchainName === 'Bitcoin');
      expect(bitcoin?.blockchainSpecific).toEqual({
        accountIndex: 0,
        extendedAccountPublicKeys: { nativeSegWit: BTC_NATIVE_SEGWIT_XPUB },
        networkId: BitcoinNetworkId('mainnet'),
      });
      expect(
        (bitcoin?.blockchainSpecific as { masterFingerprint?: string })
          .masterFingerprint,
      ).toBeUndefined();
    });

    it('projects a Bitcoin-only HardwareLedger wallet as a watch-only shell', () => {
      // A pairing names the blockchain it provisions (ADR 44), so a Bitcoin-first
      // Ledger pairing extracts no Cardano material at all — the entry must still
      // project or the guest would never see the wallet it just paired.
      const result = walletInfoToShellEntity(
        info({
          type: 'HardwareLedger',
          cardanoAccounts: [],
          bitcoinAccounts: [bitcoinAccount({ accountIndex: 0 })],
        }),
      );
      expect(result?.type).toBe(WalletType.HardwareLedger);
      expect(result?.accounts.map(a => a.blockchainName)).toEqual(['Bitcoin']);
      expect(result?.accounts[0]?.accountType).toBe('HardwareLedger');
    });

    it('skips a hardware wallet with no account on either chain', () => {
      expect(
        walletInfoToShellEntity(
          info({
            type: 'HardwareLedger',
            cardanoAccounts: [],
            bitcoinAccounts: [],
          }),
        ),
      ).toBeUndefined();
    });

    // A host-paired Trezor wallet projects as a watch-only shell (ADR 44),
    // exactly like Ledger: the same public Cardano material, but marked
    // HardwareTrezor so the guest routes signing through the host device
    // ceremony. `derivationType` stays host-internal (never on the shell).
    const trezorShell = (over: Partial<WalletInfo> = {}) => {
      const result = walletInfoToShellEntity(
        info({ type: 'HardwareTrezor', ...over }),
      );
      if (!result || result.type !== WalletType.HardwareTrezor) {
        throw new Error('expected a HardwareTrezor shell');
      }
      return result;
    };

    it('projects a HardwareTrezor wallet as a watch-only Cardano shell', () => {
      const result = trezorShell();

      expect(result.type).toBe(WalletType.HardwareTrezor);
      expect(result.metadata).toEqual({ name: 'Wallet 1', order: 0 });
      // derivationType is host-internal — never projected onto the shell.
      expect('derivationType' in result.metadata).toBe(false);

      const account0 = result.accounts[0];
      expect(account0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(account0?.blockchainName).toBe('Cardano');
      expect(account0?.accountType).toBe('HardwareTrezor');
      expect(account0?.networkType).toBe('testnet');
      expect(account0?.blockchainNetworkId).toBe(
        CardanoNetworkId(PREPROD_MAGIC),
      );
      expect(account0?.metadata.name).toBe('Account 1');
      expect(cardanoSpecific(account0)?.extendedAccountPublicKey).toBe(
        FAKE_XPUB,
      );
      expect(cardanoSpecific(account0)?.accountIndex).toBe(0);
      expect(cardanoSpecific(account0)?.chainId).toEqual({
        networkId: 0,
        networkMagic: PREPROD_MAGIC,
      });
      expect(cardanoSpecific(account0)?.networkId).toBe(
        CardanoNetworkId(PREPROD_MAGIC),
      );
    });

    it('projects EVERY HardwareTrezor account, each with its OWN network', () => {
      const result = trezorShell({
        cardanoAccounts: [
          account({ accountIndex: 0, name: 'Preprod #1' }),
          account({ accountIndex: 1, xpub: FAKE_XPUB_1, name: 'Preprod #2' }),
          account({
            accountIndex: 0,
            networkMagic: MAINNET_MAGIC,
            networkId: 1,
            name: 'Mainnet #1',
          }),
        ],
      });

      expect(result.accounts).toHaveLength(3);
      expect(
        result.accounts.every(a => a.accountType === 'HardwareTrezor'),
      ).toBe(true);
      const [preprod0, preprod1, mainnet0] = result.accounts;
      expect(preprod0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, PREPROD_MAGIC),
      );
      expect(preprod1?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 1, PREPROD_MAGIC),
      );
      expect(mainnet0?.accountId).toBe(
        CardanoAccountId(WalletId('w1'), 0, MAINNET_MAGIC),
      );
      expect(preprod0?.networkType).toBe('testnet');
      expect(mainnet0?.networkType).toBe('mainnet');
    });

    it('projects a HardwareTrezor wallet with NO secret material', () => {
      const result = trezorShell();

      expect('encryptedRecoveryPhrase' in result).toBe(false);
      expect(result.blockchainSpecific).toEqual({});
      expect(JSON.stringify(result).toLowerCase()).not.toContain('encrypted');
    });

    it('skips a HardwareTrezor wallet with no Cardano accounts', () => {
      expect(
        walletInfoToShellEntity(
          info({ type: 'HardwareTrezor', cardanoAccounts: [] }),
        ),
      ).toBeUndefined();
    });

    it('projects a HardwareTrezor wallet with BOTH Cardano and watch-only Bitcoin accounts', () => {
      const result = trezorShell({
        cardanoAccounts: [account()],
        bitcoinAccounts: [
          bitcoinAccount({
            accountIndex: 0,
            network: 'mainnet',
            masterFingerprint: 'deadbeef',
          }),
        ],
      });

      expect(result.accounts).toHaveLength(2);
      const [cardano, bitcoin] = result.accounts;
      expect(cardano?.blockchainName).toBe('Cardano');
      expect(cardano?.accountType).toBe('HardwareTrezor');
      expect(bitcoin?.blockchainName).toBe('Bitcoin');
      expect(bitcoin?.accountType).toBe('HardwareTrezor');
      expect(bitcoin?.accountId).toBe(
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Mainnet),
      );
      // The watch-only shape: nativeSegWit-only plus the device fingerprint —
      // masterFingerprint lights up blockchain-bitcoin's HW-aware PSBT build
      // path with zero monolith changes (ADR 44 property).
      expect(bitcoin?.blockchainSpecific).toEqual({
        accountIndex: 0,
        extendedAccountPublicKeys: { nativeSegWit: BTC_NATIVE_SEGWIT_XPUB },
        networkId: BitcoinNetworkId('mainnet'),
        masterFingerprint: 'deadbeef',
      });
    });

    // A migrated air-gapped wallet (Keystone / SeedSigner) projects read-only
    // (ADR 44): the same watch-only material as Ledger/Trezor, marked with the
    // device accountType so the guest UI branches on it; signing still refuses.
    it('projects a HardwareKeystone wallet with BOTH Cardano and watch-only Bitcoin accounts', () => {
      const result = walletInfoToShellEntity(
        info({
          type: 'HardwareKeystone',
          cardanoAccounts: [account()],
          bitcoinAccounts: [
            bitcoinAccount({
              accountIndex: 0,
              network: 'mainnet',
              masterFingerprint: 'deadbeef',
            }),
          ],
        }),
      );

      expect(result?.type).toBe(WalletType.HardwareKeystone);
      expect(result?.accounts).toHaveLength(2);
      const cardano = result?.accounts[0];
      const bitcoin = result?.accounts[1];
      expect(cardano?.blockchainName).toBe('Cardano');
      expect(cardano?.accountType).toBe('HardwareKeystone');
      expect(cardanoSpecific(cardano)?.extendedAccountPublicKey).toBe(
        FAKE_XPUB,
      );
      expect(cardanoSpecific(cardano)?.networkId).toBe(
        CardanoNetworkId(PREPROD_MAGIC),
      );
      expect(bitcoin?.blockchainName).toBe('Bitcoin');
      expect(bitcoin?.accountType).toBe('HardwareKeystone');
      // masterFingerprint crosses on the Bitcoin account verbatim (wire
      // field), so the HW-aware PSBT path lights up unchanged.
      expect(bitcoin?.blockchainSpecific).toEqual({
        accountIndex: 0,
        extendedAccountPublicKeys: { nativeSegWit: BTC_NATIVE_SEGWIT_XPUB },
        networkId: BitcoinNetworkId('mainnet'),
        masterFingerprint: 'deadbeef',
      });
      // Watch-only — no secret material crosses.
      expect(result && 'encryptedRecoveryPhrase' in result).toBe(false);
      expect(JSON.stringify(result).toLowerCase()).not.toContain('encrypted');
    });

    it('projects a Bitcoin-only HardwareSeedSigner wallet (no Cardano accounts)', () => {
      // A migrated Bitcoin-only SeedSigner is a monolith-supported shape, so it
      // must project despite having no Cardano account (ADR 44) — unlike a
      // Ledger/Trezor entry, which is always Cardano-first.
      const result = walletInfoToShellEntity(
        info({
          type: 'HardwareSeedSigner',
          cardanoAccounts: [],
          bitcoinAccounts: [bitcoinAccount({ accountIndex: 0 })],
        }),
      );

      expect(result?.type).toBe(WalletType.HardwareSeedSigner);
      expect(result?.accounts).toHaveLength(1);
      const bitcoin = result?.accounts[0];
      expect(bitcoin?.blockchainName).toBe('Bitcoin');
      expect(bitcoin?.accountType).toBe('HardwareSeedSigner');
      expect(bitcoin?.accountId).toBe(
        BitcoinAccountId(WalletId('w1'), 0, BitcoinNetwork.Mainnet),
      );
    });

    it('skips an air-gapped wallet with no accounts on either chain', () => {
      expect(
        walletInfoToShellEntity(
          info({
            type: 'HardwareSeedSigner',
            cardanoAccounts: [],
            bitcoinAccounts: [],
          }),
        ),
      ).toBeUndefined();
    });
  });

  describe('diffWallets', () => {
    /** The `wallets.list` id set the diff removes against. */
    const hostIds = (...walletIds: string[]) => new Set(walletIds);

    it('adds host wallets missing from the repo', () => {
      const diff = diffWallets([shell({ walletId: 'w1' })], [], hostIds('w1'));
      expect(diff.toAdd.map(w => w.walletId)).toEqual([WalletId('w1')]);
      expect(diff.toRemove).toHaveLength(0);
      expect(diff.toUpdate).toHaveLength(0);
    });

    it('removes repo wallets missing from the host', () => {
      const existing = shell({ walletId: 'w1' });
      const diff = diffWallets([], [existing], hostIds());
      expect(diff.toRemove).toEqual([
        {
          walletId: WalletId('w1'),
          accountIds: existing.accounts.map(a => a.accountId),
        },
      ]);
      expect(diff.toAdd).toHaveLength(0);
    });

    it('updates a renamed / reordered wallet', () => {
      const current = shell({ walletId: 'w1', name: 'Old', order: 0 });
      const projected = shell({ walletId: 'w1', name: 'New', order: 1 });
      const diff = diffWallets([projected], [current], hostIds('w1'));
      expect(diff.toUpdate).toEqual([
        {
          id: WalletId('w1'),
          changes: {
            metadata: { name: 'New', order: 1 },
            accounts: projected.accounts,
          },
        },
      ]);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
    });

    it('updates a wallet that gained an account (account grain)', () => {
      const current = shell({ walletId: 'w1', cardanoAccounts: [account()] });
      const projected = shell({
        walletId: 'w1',
        cardanoAccounts: [
          account(),
          account({ accountIndex: 1, xpub: FAKE_XPUB_1, name: 'Account 2' }),
        ],
      });
      const diff = diffWallets([projected], [current], hostIds('w1'));
      expect(diff.toUpdate).toHaveLength(1);
      expect(diff.toUpdate[0]?.id).toBe(WalletId('w1'));
      expect(diff.toUpdate[0]?.changes.accounts).toHaveLength(2);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
    });

    it('updates a wallet whose ACCOUNT was renamed (ids unchanged)', () => {
      const current = shell({ walletId: 'w1', cardanoAccounts: [account()] });
      const projected = shell({
        walletId: 'w1',
        cardanoAccounts: [account({ name: 'Savings' })],
      });
      const diff = diffWallets([projected], [current], hostIds('w1'));
      expect(diff.toUpdate).toEqual([
        {
          id: WalletId('w1'),
          changes: {
            metadata: { name: 'Wallet 1', order: 0 },
            accounts: projected.accounts,
          },
        },
      ]);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
    });

    it('updates a wallet whose MIDNIGHT account was renamed', () => {
      const midnightShell = (name: string) => {
        const result = walletInfoToShellEntity(
          info({
            walletId: 'w1',
            cardanoAccounts: [],
            midnightAccounts: [midnightAccount({ name })],
          }),
        );
        if (!result) throw new Error('expected a shell');
        return result;
      };
      const diff = diffWallets(
        [midnightShell('Savings')],
        [midnightShell('Midnight #0')],
        hostIds('w1'),
      );
      expect(diff.toUpdate).toHaveLength(1);
      expect(diff.toUpdate[0]?.changes.accounts[0]?.metadata.name).toBe(
        'Savings',
      );
    });

    it('produces no work for a stable per-account name (the rename check is not churn)', () => {
      const wallet = shell({
        walletId: 'w1',
        cardanoAccounts: [account({ name: 'Savings' })],
      });
      const diff = diffWallets([wallet], [wallet], hostIds('w1'));
      expect(diff.toUpdate).toHaveLength(0);
    });

    it('KEEPS a repo wallet the host still holds but the guest could not project', () => {
      // A projected type whose accounts failed the guards yields no shell.
      // Removing it would delete a live wallet from the repo — taking, say, a
      // Ledger's Bitcoin accounts with it because its Cardano ones dropped out.
      const existing = shell({ walletId: 'w1' });
      const diff = diffWallets([], [existing], hostIds('w1'));
      expect(diff.toRemove).toHaveLength(0);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toUpdate).toHaveLength(0);
    });

    it('produces no work when the projection matches the repo', () => {
      const wallet = shell({ walletId: 'w1' });
      const diff = diffWallets([wallet], [wallet], hostIds('w1'));
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
      expect(diff.toUpdate).toHaveLength(0);
    });

    it('updates a renamed hardware (Trezor) wallet through the hardware branch', () => {
      const hwShell = (over: Partial<WalletInfo>) => {
        const result = walletInfoToShellEntity(
          info({ type: 'HardwareTrezor', walletId: 'w1', ...over }),
        );
        if (!result) throw new Error('expected a shell');
        return result;
      };
      const current = hwShell({ name: 'Old', order: 0 });
      const projected = hwShell({ name: 'New', order: 1 });
      const diff = diffWallets([projected], [current], hostIds('w1'));
      expect(diff.toUpdate).toEqual([
        {
          id: WalletId('w1'),
          changes: {
            metadata: { name: 'New', order: 1 },
            accounts: projected.accounts,
          },
        },
      ]);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
    });

    it('updates a renamed LazyInMemory wallet through the lazy branch', () => {
      const lazyShell = (over: Partial<WalletInfo>) => {
        const result = walletInfoToShellEntity(
          info({ type: 'LazyInMemory', walletId: 'w1', ...over }),
        );
        if (!result) throw new Error('expected a shell');
        return result;
      };
      const current = lazyShell({ name: 'Old', order: 0 });
      const projected = lazyShell({ name: 'New', order: 1 });
      const diff = diffWallets([projected], [current], hostIds('w1'));
      expect(diff.toUpdate).toEqual([
        {
          id: WalletId('w1'),
          changes: {
            metadata: { name: 'New', order: 1 },
            accounts: projected.accounts,
          },
        },
      ]);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
    });

    it('updates a renamed air-gapped (Keystone) wallet through the hardware branch', () => {
      const hwShell = (over: Partial<WalletInfo>) => {
        const result = walletInfoToShellEntity(
          info({ type: 'HardwareKeystone', walletId: 'w1', ...over }),
        );
        if (!result) throw new Error('expected a shell');
        return result;
      };
      const current = hwShell({ name: 'Old', order: 0 });
      const projected = hwShell({ name: 'New', order: 1 });
      const diff = diffWallets([projected], [current], hostIds('w1'));
      expect(diff.toUpdate).toEqual([
        {
          id: WalletId('w1'),
          changes: {
            metadata: { name: 'New', order: 1 },
            accounts: projected.accounts,
          },
        },
      ]);
      expect(diff.toAdd).toHaveLength(0);
      expect(diff.toRemove).toHaveLength(0);
    });
  });

  describe('hydrateWalletRepo side effect', () => {
    const okResult = (wallets: WalletInfo[]): LaceResult<WalletInfo[]> => ({
      ok: true,
      value: wallets,
    });

    /**
     * A repo that applies what the hydrator dispatches. Every window re-arms
     * after each change it observes, so its follow-up diffs against the state
     * the dispatch produced — a constant repo would re-observe the same diff
     * forever, which the real store cannot do.
     */
    const liveRepo = (initial: AnyWallet[] = []) => {
      const wallets$ = new BehaviorSubject<AnyWallet[]>(initial);
      const { addWallet, removeWallet, updateWallet } = walletsActions.wallets;
      return {
        selectAll$: wallets$,
        record: (dispatched: unknown): void => {
          const action = dispatched as { type: string };
          const current = wallets$.value;
          if (addWallet.match(action)) {
            wallets$.next([...current, action.payload]);
          } else if (removeWallet.match(action)) {
            wallets$.next(
              current.filter(w => w.walletId !== action.payload.walletId),
            );
          } else if (updateWallet.match(action)) {
            wallets$.next(
              current.map(w =>
                w.walletId === action.payload.id
                  ? ({ ...w, ...action.payload.changes } as AnyWallet)
                  : w,
              ),
            );
          }
        },
      };
    };

    // F2 regression: a slow ceremony lands the wallet AFTER the boot/sync poll
    // window's 60s ceiling has elapsed. The absent completion push (ADR 34) is
    // stood in for by the guest regaining attention when the host ceremony
    // window closes — that refocus must re-arm a poll and dispatch the add.
    it('re-arms a bounded poll on refocus so a wallet that lands past the poll ceiling still appears', () => {
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');

        // Vault stays empty through the whole boot window (>58.5s in the
        // ceremony); the ceremony persists the wallet as its host window closes,
        // i.e. exactly when the guest regains focus — modeled by flipping the
        // vault on the refocus itself, well past the 60s ceiling.
        let hostWallets: WalletInfo[] = [];

        return {
          actionObservables: {
            cardanoHostPull: { syncWalletsRequested$: NEVER },
          },
          stateObservables: { wallets: { selectAll$: cold('a', { a: [] }) } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => cold('(a|)', { a: okResult(hostWallets) }),
            windowRefocus$: hot('61002ms r', { r: undefined }).pipe(
              tap(() => {
                hostWallets = [w1];
              }),
            ),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('61002ms a', {
              a: walletsActions.wallets.addWallet(projected),
            });
          },
        };
      });
    });

    it('costs a single wallets.list read per no-change refocus and dispatches nothing', () => {
      const countReads = (refocusMarble: string): number => {
        let reads = 0;
        testSideEffect(
          hydrateWalletRepo,
          ({ hot, cold, expectObservable }) => ({
            actionObservables: {
              cardanoHostPull: { syncWalletsRequested$: NEVER },
            },
            stateObservables: { wallets: { selectAll$: cold('a', { a: [] }) } },
            dependencies: {
              actions: walletsActions,
              logger: dummyLogger,
              listHostWallets: () => {
                reads += 1;
                return cold('(a|)', { a: okResult([]) });
              },
              // Fires past the exhausted boot window, isolating its read count.
              windowRefocus$: hot(refocusMarble, { r: undefined }),
            },
            assertion: sideEffect$ => {
              expectObservable(sideEffect$).toBe('');
            },
          }),
        );
        return reads;
      };

      const bootOnly = countReads('-'); // boot window alone
      const withRefocus = countReads('61000ms r'); // one refocus, no host change
      expect(withRefocus).toBe(bootOnly + 1);
    });

    it('cancels an in-flight poll window when a newer trigger opens one', () => {
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        // The vault holds w1 when the boot window fires its read; the wallet is
        // removed while that read is still in flight, so its answer is STALE. A
        // removal is a host CEREMONY, so it settles and re-syncs — that trigger,
        // not a focus event, is what must cancel the stale window.
        let hostWallets: WalletInfo[] = [w1];

        return {
          actionObservables: {
            cardanoHostPull: {
              syncWalletsRequested$: hot('1000ms s', {
                s: syncWalletsRequested(),
              }).pipe(
                tap(() => {
                  hostWallets = [];
                }),
              ),
            },
          },
          // The repo already reflects the removal.
          stateObservables: { wallets: { selectAll$: cold('a', { a: [] }) } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () =>
              cold('4000ms (a|)', { a: okResult(hostWallets) }),
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            // Nothing: the re-sync window supersedes the boot one, so the stale
            // answer never lands and cannot re-add the removed wallet.
            expectObservable(sideEffect$).toBe('');
          },
        };
      });
    });

    // THE defect behind the QA report: a refocus used to supersede the window a
    // ceremony had just opened, swapping a window that outlasts a hand-driven QR
    // exchange for ONE read taken seconds after the mount. Focus churns precisely
    // while a ceremony runs — its window takes focus and gives it back — so the
    // wallet then landed with no window open at all, and the guest never saw it.
    it('keeps polling a ceremony window when the guest regains focus mid-ceremony', () => {
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');

        // The mount lands at 2000ms, after the boot window's reads at 0 and
        // 1500ms; the ceremony window then reads every 1500ms from 2000ms. The
        // QR exchange runs 30s, so the vault flips on the read at 32000ms.
        const READS_BEFORE_PAIRING = 2 + 20;
        let reads = 0;
        const hostWalletsNow = (): WalletInfo[] =>
          reads >= READS_BEFORE_PAIRING ? [w1] : [];
        const repo = liveRepo();

        return {
          actionObservables: {
            cardanoHostPull: {
              syncWalletsRequested$: hot('2000ms s', {
                s: syncWalletsRequested(),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => {
              const wallets = hostWalletsNow();
              reads += 1;
              return cold('(a|)', { a: okResult(wallets) });
            },
            // The pairing window taking focus and handing it back churns the
            // guest's focus right after the mount.
            windowRefocus$: hot('2500ms r 1500ms r', { r: undefined }),
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('32000ms a', {
              a: walletsActions.wallets.addWallet(projected),
            });
          },
        };
      });
    });

    it('warns about a host wallet it cannot project instead of letting it look absent', () => {
      const warn = vi.fn();
      testSideEffect(hydrateWalletRepo, ({ cold, expectObservable }) => ({
        actionObservables: {
          cardanoHostPull: { syncWalletsRequested$: NEVER },
        },
        stateObservables: { wallets: { selectAll$: cold('a', { a: [] }) } },
        dependencies: {
          actions: walletsActions,
          logger: { ...dummyLogger, warn },
          listHostWallets: () =>
            cold('(a|)', {
              a: okResult([
                info({
                  walletId: 'w1',
                  cardanoAccounts: [],
                  bitcoinAccounts: [],
                }),
              ]),
            }),
          windowRefocus$: NEVER,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('');
        },
      }));
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('w1 (type InMemory) projects no shell'),
      );
    });

    it('hydrates a LazyInMemory host wallet into the repo', () => {
      testSideEffect(hydrateWalletRepo, ({ cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1', type: 'LazyInMemory' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');
        const repo = liveRepo();

        return {
          actionObservables: {
            cardanoHostPull: { syncWalletsRequested$: NEVER },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => cold('(a|)', { a: okResult([w1]) }),
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('a', {
              a: walletsActions.wallets.addWallet(projected),
            });
          },
        };
      });
    });

    it('never removes a repo wallet whose type it cannot project, and names why', () => {
      const warn = vi.fn();
      testSideEffect(hydrateWalletRepo, ({ cold, expectObservable }) => {
        // The wallet is in the repo AND still in the host vault; only the guest
        // projection is missing. Removing it here would delete a live wallet.
        const existing = walletInfoToShellEntity(info({ walletId: 'w1' }));
        if (!existing) throw new Error('expected a shell');

        return {
          actionObservables: {
            cardanoHostPull: { syncWalletsRequested$: NEVER },
          },
          stateObservables: {
            wallets: { selectAll$: cold('a', { a: [existing] }) },
          },
          dependencies: {
            actions: walletsActions,
            logger: { ...dummyLogger, warn },
            listHostWallets: () =>
              cold('(a|)', {
                a: okResult([
                  info({ walletId: 'w1', type: 'MultiSig' }),
                  info({ walletId: 'w2', type: 'Script' }),
                ]),
              }),
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('');
          },
        };
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'w1 is NOT shown in the guest — MultiSig is unsupported in the shell',
        ),
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'w2 is NOT shown in the guest — no guest projection exists for type Script',
        ),
      );
    });

    it('projects a wallet already present in the host vault on boot', () => {
      testSideEffect(hydrateWalletRepo, ({ cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');
        const repo = liveRepo();

        return {
          actionObservables: {
            cardanoHostPull: { syncWalletsRequested$: NEVER },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => cold('(a|)', { a: okResult([w1]) }),
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('a', {
              a: walletsActions.wallets.addWallet(projected),
            });
          },
        };
      });
    });

    it('re-runs a full poll window on an explicit syncWalletsRequested', () => {
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');

        // The wallet lands on the vault as the ceremony resolves (the guest
        // dispatches syncWalletsRequested at mount, then re-syncs) — modeled by
        // flipping the vault on the trigger, past the exhausted boot window.
        let hostWallets: WalletInfo[] = [];
        const repo = liveRepo();

        return {
          actionObservables: {
            cardanoHostPull: {
              syncWalletsRequested$: hot('70002ms s', {
                s: syncWalletsRequested(),
              }).pipe(
                tap(() => {
                  hostWallets = [w1];
                }),
              ),
            },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => cold('(a|)', { a: okResult(hostWallets) }),
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('70002ms a', {
              a: walletsActions.wallets.addWallet(projected),
            });
          },
        };
      });
    });

    // The ceremony window a syncWalletsRequested opens, triggered past the
    // exhausted boot window (which spends BOOT_READS of its own first). Its
    // reads fall at n * 1500ms for the first 40, then every 5000ms from the
    // 40th read's 58500ms; CEREMONY_READS is the whole window.
    const BOOT_READS = 40;
    const CEREMONY_TRIGGER_AT = 70_002;
    const CEREMONY_READS = 148;
    /** The bounded follow-up window every observed change re-arms — one flat
     * {@link BOOT_READS}-read window, spent in full when nothing else lands. */
    const QUIET_WINDOW_READS = 40;
    const ceremonyElapsedAt = (index: number): number =>
      index < 40 ? index * 1500 : 58_500 + (index - 39) * 5000;
    const ceremonyReadAt = (index: number): number =>
      CEREMONY_TRIGGER_AT + ceremonyElapsedAt(index);

    /** Run one ceremony window whose vault starts empty and holds w1 from
     * `landsOnRead` onwards. Returns how many reads it took in total. */
    const runCeremonyWindow = ({
      landsOnRead,
      expectedMarble,
    }: {
      landsOnRead: number;
      expectedMarble: string;
    }): number => {
      let reads = 0;
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');
        const repo = liveRepo();

        return {
          actionObservables: {
            cardanoHostPull: {
              syncWalletsRequested$: hot(`${CEREMONY_TRIGGER_AT}ms s`, {
                s: syncWalletsRequested(),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => {
              const hasLanded = reads - BOOT_READS >= landsOnRead;
              reads += 1;
              return cold('(a|)', { a: okResult(hasLanded ? [w1] : []) });
            },
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe(expectedMarble, {
              a: walletsActions.wallets.addWallet(projected),
            });
          },
        };
      });
      return reads;
    };

    // The bug: an air-gapped pairing is a hand-driven two-way QR exchange that
    // routinely runs past a minute, and the ceremony pushes nothing back on
    // completion — so a flat 60s window left the minted wallet in the host vault
    // and the user staring at the device picker.
    it('projects a wallet the ceremony lands minutes after a flat 60s window would have closed', () => {
      const reads = runCeremonyWindow({
        landsOnRead: 100,
        expectedMarble: `${ceremonyReadAt(100)}ms a`,
      });
      expect(ceremonyElapsedAt(100)).toBeGreaterThan(5 * 60 * 1000);
      expect(reads).toBe(BOOT_READS + 101 + QUIET_WINDOW_READS);
    });

    it('polls a ceremony out to a ~10 minute ceiling, backing the cadence off after the first minute', () => {
      const lastRead = CEREMONY_READS - 1;
      const reads = runCeremonyWindow({
        landsOnRead: lastRead,
        expectedMarble: `${ceremonyReadAt(lastRead)}ms a`,
      });
      expect(reads).toBe(BOOT_READS + CEREMONY_READS + QUIET_WINDOW_READS);
      // A flat 1.5s cadence would have cost ~400 reads to reach the same ceiling.
      expect(ceremonyElapsedAt(lastRead)).toBe(598_500);
    });

    it('closes the ceremony window at the ceiling instead of polling the host forever', () => {
      const reads = runCeremonyWindow({
        landsOnRead: CEREMONY_READS,
        expectedMarble: '',
      });
      // Nothing landed, so nothing re-armed a follow-up window either.
      expect(reads).toBe(BOOT_READS + CEREMONY_READS);
    });

    // The host wallet manager runs rename / remove / add-account from ONE mount
    // (ADR 36 §3) and pushes nothing back, so the guest gets exactly ONE
    // syncWalletsRequested for the whole session. A window that closed on the
    // first change left every later one stranded until an unrelated boot or
    // refocus — and a refocus is not guaranteed when a host window closes.
    it('projects a SECOND change made in the same host manager session', () => {
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const w2 = info({ walletId: 'w2', name: 'Wallet 2' });
        const p1 = walletInfoToShellEntity(w1);
        const p2 = walletInfoToShellEntity(w2);
        if (!p1 || !p2) throw new Error('expected shells');
        const repo = liveRepo();

        // w1 lands on the ceremony window's read 2 (frame 73002); the user then
        // adds w2 inside the still-open manager, landing on the follow-up
        // window's read 2 (frame 76002).
        let reads = 0;
        const hostWalletsNow = (): WalletInfo[] => {
          const ceremonyRead = reads - BOOT_READS;
          if (ceremonyRead >= 5) return [w1, w2];
          if (ceremonyRead >= 2) return [w1];
          return [];
        };

        return {
          actionObservables: {
            cardanoHostPull: {
              syncWalletsRequested$: hot(`${CEREMONY_TRIGGER_AT}ms s`, {
                s: syncWalletsRequested(),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => {
              const wallets = hostWalletsNow();
              reads += 1;
              return cold('(a|)', { a: okResult(wallets) });
            },
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('73002ms a 2999ms b', {
              a: walletsActions.wallets.addWallet(p1),
              b: walletsActions.wallets.addWallet(p2),
            });
          },
        };
      });
    });

    // The boot window used to end on the FIRST non-empty diff it observed and,
    // unlike a ceremony window, never re-arm. A write landing after that was
    // silently invisible to the repo — no error, no retry — until an unrelated
    // mount request or a refocus happened to open a new window, and neither is
    // guaranteed to come.
    it('projects a wallet that lands after the boot window observed its first change', () => {
      let reads = 0;
      testSideEffect(hydrateWalletRepo, ({ cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const w2 = info({ walletId: 'w2', name: 'Wallet 2' });
        const p1 = walletInfoToShellEntity(w1);
        const p2 = walletInfoToShellEntity(w2);
        if (!p1 || !p2) throw new Error('expected shells');
        const repo = liveRepo();

        // w1 is already in the vault, so the boot read spends the window on it;
        // w2 lands on the re-armed window's third read (frame 3000).
        const hostWalletsNow = (): WalletInfo[] =>
          reads >= 3 ? [w1, w2] : [w1];

        return {
          actionObservables: {
            cardanoHostPull: { syncWalletsRequested$: NEVER },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => {
              const wallets = hostWalletsNow();
              reads += 1;
              return cold('(a|)', { a: okResult(wallets) });
            },
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('a 2999ms b', {
              a: walletsActions.wallets.addWallet(p1),
              b: walletsActions.wallets.addWallet(p2),
            });
          },
        };
      });
      // Bounded: the boot read, three re-armed reads, then one quiet window that
      // observes nothing and ends the chain — the host SW idles again.
      expect(reads).toBe(4 + QUIET_WINDOW_READS);
    });

    // The probe-harness path (spec 06): the vault is reset between legs, so the
    // guest boots holding the previous leg's wallet and the boot window's first
    // read observes only that removal. The re-import lands after it — with the
    // one-shot window closed, the guest stayed on onboarding while the host
    // vault held the wallet.
    it('projects a re-import that lands after the boot window removed a stale wallet', () => {
      let reads = 0;
      testSideEffect(hydrateWalletRepo, ({ cold, expectObservable }) => {
        const stale = walletInfoToShellEntity(info({ walletId: 'w1' }));
        const reimport = info({ walletId: 'w2', name: 'Wallet 2' });
        const reimported = walletInfoToShellEntity(reimport);
        if (!stale || !reimported) throw new Error('expected shells');
        const repo = liveRepo([stale]);

        // The vault answers empty (reset) for the boot read and the re-armed
        // window's first read; the re-import lands on its second (frame 1500).
        const hostWalletsNow = (): WalletInfo[] =>
          reads >= 2 ? [reimport] : [];

        return {
          actionObservables: {
            cardanoHostPull: { syncWalletsRequested$: NEVER },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => {
              const wallets = hostWalletsNow();
              reads += 1;
              return cold('(a|)', { a: okResult(wallets) });
            },
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('a 1499ms b', {
              a: walletsActions.wallets.removeWallet(
                stale.walletId,
                stale.accounts.map(account => account.accountId),
              ),
              b: walletsActions.wallets.addWallet(reimported),
            });
          },
        };
      });
      expect(reads).toBe(3 + QUIET_WINDOW_READS);
    });

    // ONE window at a time still holds now that a window re-arms: the follow-up
    // belongs to the chain the `switchMap` cancels, so a read taken before a
    // removal landed cannot resurrect the wallet that removal took out.
    it('never resurrects a wallet from a re-armed window superseded mid-read', () => {
      testSideEffect(hydrateWalletRepo, ({ hot, cold, expectObservable }) => {
        const w1 = info({ walletId: 'w1' });
        const projected = walletInfoToShellEntity(w1);
        if (!projected) throw new Error('expected a shell');
        const repo = liveRepo();

        // The boot read adds w1 and re-arms; that follow-up's read is still in
        // flight — holding the pre-removal [w1] — when the removal ceremony
        // settles at 1000ms and supersedes the window.
        let hostWallets: WalletInfo[] = [w1];
        let reads = 0;

        return {
          actionObservables: {
            cardanoHostPull: {
              syncWalletsRequested$: hot('1000ms s', {
                s: syncWalletsRequested(),
              }).pipe(
                tap(() => {
                  hostWallets = [];
                }),
              ),
            },
          },
          stateObservables: { wallets: { selectAll$: repo.selectAll$ } },
          dependencies: {
            actions: walletsActions,
            logger: dummyLogger,
            listHostWallets: () => {
              const answer = okResult(hostWallets);
              reads += 1;
              return reads === 2
                ? cold('4000ms (a|)', { a: answer })
                : cold('(a|)', { a: answer });
            },
            windowRefocus$: NEVER,
          },
          assertion: sideEffect$ => {
            // Nothing at 4000ms: the superseded window's stale [w1] never lands.
            expectObservable(
              sideEffect$.pipe(
                tap(action => {
                  repo.record(action);
                }),
              ),
            ).toBe('a 999ms b', {
              a: walletsActions.wallets.addWallet(projected),
              b: walletsActions.wallets.removeWallet(
                projected.walletId,
                projected.accounts.map(account => account.accountId),
              ),
            });
          },
        };
      });
    });
  });
});
