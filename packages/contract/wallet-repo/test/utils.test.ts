import { Timestamp } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import { WalletType } from '../src/types';
import {
  findWalletSharingIdentity,
  isHardwareAccountType,
  isHardwareWallet,
  stampAccountsOnboardedAt,
  stampWalletOnboardedAt,
} from '../src/utils';
import { AccountIdentityKey, WalletId } from '../src/value-objects';

import type { AnyAccount, AnyWallet, WalletIdentity } from '../src/types';
import type { ByBlockchainName } from '@lace-lib/util-store';

const cardanoIdentity: ByBlockchainName<WalletIdentity> = {
  Cardano: {
    blockchainName: 'Cardano',
    getAccountIdentityKey: (account: AnyAccount) => {
      const xpub = (
        account.blockchainSpecific as { extendedAccountPublicKey?: string }
      ).extendedAccountPublicKey;
      return xpub ? AccountIdentityKey(xpub) : undefined;
    },
  },
};

const hwWallet = (walletId: string, xpub: string): AnyWallet =>
  ({
    walletId: WalletId(walletId),
    type: WalletType.HardwareLedger,
    metadata: { name: walletId, order: 0 },
    accounts: [
      {
        blockchainName: 'Cardano',
        blockchainSpecific: { extendedAccountPublicKey: xpub },
      },
    ],
    blockchainSpecific: {},
  } as unknown as AnyWallet);

const walletOfType = (type: WalletType): AnyWallet =>
  ({
    walletId: WalletId('wallet'),
    type,
    metadata: { name: 'wallet', order: 0 },
    accounts: [],
    blockchainSpecific: {},
  } as unknown as AnyWallet);

describe('isHardwareWallet', () => {
  it('returns true for Ledger, Trezor, Seed Signer and Keystone wallets', () => {
    expect(isHardwareWallet(walletOfType(WalletType.HardwareLedger))).toBe(
      true,
    );
    expect(isHardwareWallet(walletOfType(WalletType.HardwareTrezor))).toBe(
      true,
    );
    expect(isHardwareWallet(walletOfType(WalletType.HardwareSeedSigner))).toBe(
      true,
    );
    expect(isHardwareWallet(walletOfType(WalletType.HardwareKeystone))).toBe(
      true,
    );
  });

  it('returns false for non-hardware wallets', () => {
    expect(isHardwareWallet(walletOfType(WalletType.InMemory))).toBe(false);
    expect(isHardwareWallet(walletOfType(WalletType.LazyInMemory))).toBe(false);
    expect(isHardwareWallet(walletOfType(WalletType.MultiSig))).toBe(false);
  });
});

describe('isHardwareAccountType', () => {
  it('returns true for the hardware account types', () => {
    expect(isHardwareAccountType('HardwareLedger')).toBe(true);
    expect(isHardwareAccountType('HardwareTrezor')).toBe(true);
    expect(isHardwareAccountType('HardwareSeedSigner')).toBe(true);
    expect(isHardwareAccountType('HardwareKeystone')).toBe(true);
  });

  it('returns false for software account types', () => {
    expect(isHardwareAccountType('InMemory')).toBe(false);
    expect(isHardwareAccountType('MultiSig')).toBe(false);
  });
});

describe('findWalletSharingIdentity', () => {
  it('returns the existing wallet that shares an account identity key', () => {
    const existing = [
      hwWallet('wallet-a', 'xpub-1'),
      hwWallet('wallet-b', 'xpub-2'),
    ];
    const candidate = hwWallet('wallet-c', 'xpub-2');

    expect(
      findWalletSharingIdentity(candidate, existing, cardanoIdentity),
    ).toBe(existing[1]);
  });

  it('matches across differing walletIds (migration vs fresh device descriptor)', () => {
    const migrated = hwWallet('public-key-hash-id', 'xpub-shared');
    const candidate = hwWallet('usb-hw-1-2-serial', 'xpub-shared');

    expect(
      findWalletSharingIdentity(candidate, [migrated], cardanoIdentity),
    ).toBe(migrated);
  });

  it('returns undefined when no existing wallet shares an identity key', () => {
    const existing = [hwWallet('wallet-a', 'xpub-1')];
    const candidate = hwWallet('wallet-c', 'xpub-3');

    expect(
      findWalletSharingIdentity(candidate, existing, cardanoIdentity),
    ).toBeUndefined();
  });

  it('fails open when no extractor is available for the candidate accounts', () => {
    const existing = [hwWallet('wallet-a', 'xpub-1')];
    const candidate = hwWallet('wallet-c', 'xpub-1');

    expect(findWalletSharingIdentity(candidate, existing, {})).toBeUndefined();
  });
});

const account = (name: string, onboardedAt?: number): AnyAccount =>
  ({
    accountId: name,
    walletId: WalletId('w'),
    accountType: 'InMemory',
    blockchainName: 'Cardano',
    metadata:
      onboardedAt === undefined
        ? { name }
        : { name, onboardedAt: Timestamp(onboardedAt) },
    blockchainSpecific: {},
  } as unknown as AnyAccount);

describe('stampAccountsOnboardedAt', () => {
  it('stamps onboardedAt on accounts that lack it', () => {
    const result = stampAccountsOnboardedAt([account('a')], Timestamp(123));
    expect(result[0].metadata.onboardedAt).toBe(123);
  });

  it('preserves an existing onboardedAt', () => {
    const result = stampAccountsOnboardedAt(
      [account('a', 999)],
      Timestamp(123),
    );
    expect(result[0].metadata.onboardedAt).toBe(999);
  });

  it('defaults onboardedAt to Date.now() when omitted', () => {
    const before = Date.now();
    const result = stampAccountsOnboardedAt([account('a')]);
    const stamped = result[0].metadata.onboardedAt;
    expect(stamped).toBeGreaterThanOrEqual(before);
  });
});

describe('stampWalletOnboardedAt', () => {
  it('stamps onboardedAt on every account lacking it', () => {
    const wallet = {
      walletId: WalletId('w'),
      type: WalletType.InMemory,
      metadata: { name: 'w', order: 0 },
      blockchainSpecific: {},
      accounts: [account('a'), account('b', 999)],
    } as unknown as AnyWallet;

    const result = stampWalletOnboardedAt(wallet, Timestamp(123));
    expect(result.accounts[0].metadata.onboardedAt).toBe(123);
    expect(result.accounts[1].metadata.onboardedAt).toBe(999);
  });
});
