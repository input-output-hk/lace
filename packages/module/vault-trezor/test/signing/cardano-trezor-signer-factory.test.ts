import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { CardanoTrezorDataSigner } from '../../src/signing/cardano-trezor-data-signer';
import { CardanoTrezorSignerFactory } from '../../src/signing/cardano-trezor-signer-factory';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoTransactionSigner,
  CardanoSignerContext,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

// ─── fixtures ────────────────────────────────────────────────────────────────

const testAccountId = AccountId('account-0');
const testWalletId = WalletId('wallet-0');

const testChainId: Cardano.ChainId = {
  networkId: 1,
  networkMagic: 764_824_073,
};
// Bip32PublicKeyHex requires exactly 128 hex characters (64 bytes).
const testXpub = 'a'.repeat(128) as Bip32PublicKeyHex;

const makeTrezorAccount = (
  overrides: Partial<{
    accountType: AnyAccount['accountType'];
    blockchainName: string;
    blockchainSpecific: object;
  }> = {},
): AnyAccount =>
  ({
    accountId: testAccountId,
    walletId: testWalletId,
    blockchainName: overrides.blockchainName ?? 'Cardano',
    networkType: 'mainnet' as const,
    blockchainNetworkId: 'cardano-764824073',
    metadata: { name: 'Account #0' },
    accountType: overrides.accountType ?? 'HardwareTrezor',
    blockchainSpecific: overrides.blockchainSpecific ?? {
      accountIndex: 0,
      chainId: testChainId,
      extendedAccountPublicKey: testXpub,
    },
  } as AnyAccount);

const makeTrezorWallet = (
  derivationType?: 'ICARUS_TREZOR' | 'ICARUS' | 'LEDGER',
): AnyWallet =>
  ({
    walletId: testWalletId,
    type: WalletType.HardwareTrezor,
    metadata: {
      name: 'Trezor',
      order: 0,
      ...(derivationType ? { derivationType } : {}),
    },
    blockchainSpecific: {},
    accounts: [makeTrezorAccount()],
  } as AnyWallet);

const dummyAuth = {
  authenticate: vi.fn(),
  accessAuthSecret: vi.fn(),
};

const makeSignerContext = (
  wallet: AnyWallet,
  partial: Partial<CardanoTransactionSignerContext> = {},
): CardanoTransactionSignerContext => ({
  wallet,
  accountId: testAccountId,
  knownAddresses: [] as GroupedAddress[],
  auth: dummyAuth,
  utxo: [] as Cardano.Utxo[],
  ...partial,
});

const stubTransactionSigner = {} as CardanoTransactionSigner;

const makeFactory = () => {
  const createTransactionSigner = vi.fn(() => stubTransactionSigner);
  const factory = new CardanoTrezorSignerFactory({ createTransactionSigner });
  return { factory, createTransactionSigner };
};

// ─── canSign ─────────────────────────────────────────────────────────────────

describe('CardanoTrezorSignerFactory', () => {
  describe('canSign', () => {
    it('returns true for a HardwareTrezor Cardano account', () => {
      const { factory } = makeFactory();
      expect(factory.canSign(makeTrezorAccount())).toBe(true);
    });

    it('returns false for a HardwareLedger account', () => {
      const { factory } = makeFactory();
      expect(
        factory.canSign(makeTrezorAccount({ accountType: 'HardwareLedger' })),
      ).toBe(false);
    });

    it('returns false for an InMemory account', () => {
      const { factory } = makeFactory();
      expect(
        factory.canSign(makeTrezorAccount({ accountType: 'InMemory' })),
      ).toBe(false);
    });

    it('returns false for a HardwareTrezor account on a non-Cardano blockchain', () => {
      const { factory } = makeFactory();
      expect(
        factory.canSign(makeTrezorAccount({ blockchainName: 'Bitcoin' })),
      ).toBe(false);
    });
  });

  // ─── createTransactionSigner ───────────────────────────────────────────────

  describe('createTransactionSigner', () => {
    it('delegates to the injected createTransactionSigner with the account props and context', () => {
      const { factory, createTransactionSigner } = makeFactory();
      const context = makeSignerContext(makeTrezorWallet());

      const signer = factory.createTransactionSigner(context);

      expect(signer).toBe(stubTransactionSigner);
      expect(createTransactionSigner).toHaveBeenCalledTimes(1);
      expect(createTransactionSigner).toHaveBeenCalledWith({
        accountIndex: 0,
        chainId: testChainId,
        extendedAccountPublicKey: testXpub,
        derivationType: undefined,
        knownAddresses: context.knownAddresses,
        utxo: context.utxo,
      });
    });

    it('throws when the account is not found in the wallet', () => {
      const { factory, createTransactionSigner } = makeFactory();
      const walletWithNoAccounts: AnyWallet = {
        ...makeTrezorWallet(),
        accounts: [],
      };
      expect(() =>
        factory.createTransactionSigner(
          makeSignerContext(walletWithNoAccounts),
        ),
      ).toThrow(/does not support account type/);
      expect(createTransactionSigner).not.toHaveBeenCalled();
    });

    it('throws when the account type is not supported (HardwareLedger)', () => {
      const { factory } = makeFactory();
      const ledgerWallet = {
        ...makeTrezorWallet(),
        type: WalletType.HardwareLedger,
        accounts: [makeTrezorAccount({ accountType: 'HardwareLedger' })],
      } as AnyWallet;
      expect(() =>
        factory.createTransactionSigner(makeSignerContext(ledgerWallet)),
      ).toThrow(/does not support account type/);
    });

    it('forwards derivationType from wallet metadata to the injected signer factory', () => {
      const { factory, createTransactionSigner } = makeFactory();
      factory.createTransactionSigner(
        makeSignerContext(makeTrezorWallet('ICARUS_TREZOR')),
      );

      expect(createTransactionSigner).toHaveBeenCalledWith(
        expect.objectContaining({ derivationType: 'ICARUS_TREZOR' }),
      );
    });

    it('passes derivationType as undefined when wallet metadata omits it', () => {
      const { factory, createTransactionSigner } = makeFactory();
      factory.createTransactionSigner(makeSignerContext(makeTrezorWallet()));

      expect(createTransactionSigner).toHaveBeenCalledWith(
        expect.objectContaining({ derivationType: undefined }),
      );
    });
  });

  // ─── createDataSigner ─────────────────────────────────────────────────────

  describe('createDataSigner', () => {
    it('returns a CardanoTrezorDataSigner for a supported context', () => {
      const { factory } = makeFactory();
      const context: CardanoSignerContext = {
        wallet: makeTrezorWallet(),
        accountId: testAccountId,
        knownAddresses: [] as GroupedAddress[],
        auth: dummyAuth,
      };
      const signer = factory.createDataSigner(context);
      expect(signer).toBeInstanceOf(CardanoTrezorDataSigner);
    });

    it('throws when the account is not found (unsupported context)', () => {
      const { factory } = makeFactory();
      const context: CardanoSignerContext = {
        wallet: { ...makeTrezorWallet(), accounts: [] },
        accountId: testAccountId,
        knownAddresses: [] as GroupedAddress[],
        auth: dummyAuth,
      };
      expect(() => factory.createDataSigner(context)).toThrow(
        /does not support account type/,
      );
    });
  });
});
