import { createInputResolver } from '@lace-contract/cardano-context';
import { AccountId, HardwareWalletId } from '@lace-contract/wallet-repo';
import {
  OWN_COLLATERAL_UTXO,
  expectCollateralGuardRefusesCaseB,
} from '@lace-lib/util-dev-cardano';
import { describe, expect, it, vi } from 'vitest';

import { CardanoLedgerSignerFactory } from '../../src/signing/cardano-ledger-signer-factory';
import { CardanoLedgerTransactionSigner } from '../../src/signing/cardano-ledger-transaction-signer';

import type { CardanoLedgerSignerFactoryDependencies } from '../../src/signing/cardano-ledger-signer-factory';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoTransactionSignerContext } from '@lace-contract/cardano-context';
import type {
  AnyAccount,
  HardwareWalletLedger,
} from '@lace-contract/wallet-repo';

// This factory previously had no dedicated test file (only the transaction/
// data signer classes were tested) -- created here so every Cardano signer
// factory has a guard-wrapping probe.

const testAccountId = AccountId('account-0');
const testWalletId = HardwareWalletId({
  kind: 'usb',
  vendorId: 0x2c_97,
  productId: 0x00_11,
  serialNumber: null,
});
const testChainId: Cardano.ChainId = {
  networkId: 1,
  networkMagic: 764_824_073,
};
// Bip32PublicKeyHex requires exactly 128 hex characters (64 bytes).
const testXpub = 'a'.repeat(128) as Bip32PublicKeyHex;

const ledgerAccount = {
  accountId: testAccountId,
  walletId: testWalletId,
  blockchainName: 'Cardano',
  accountType: 'HardwareLedger',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: testChainId,
    extendedAccountPublicKey: testXpub,
  },
} as unknown as AnyAccount;

const ledgerWallet = {
  walletId: testWalletId,
  accounts: [ledgerAccount],
} as unknown as HardwareWalletLedger;

const dependencies: CardanoLedgerSignerFactoryDependencies = {
  transport: { createKeyAgent: vi.fn(), getXpub: vi.fn() } as never,
};

const buildContext = (
  overrides: Partial<
    CardanoTransactionSignerContext & { wallet: HardwareWalletLedger }
  > = {},
): CardanoTransactionSignerContext & { wallet: HardwareWalletLedger } =>
  ({
    wallet: ledgerWallet,
    accountId: testAccountId,
    knownAddresses: [] as GroupedAddress[],
    utxo: [] as Cardano.Utxo[],
    // Non-empty on purpose: most of this suite never triggers the guard's
    // ownership evaluation, but an empty set would make the guard inert.
    collateralInputResolver: createInputResolver([OWN_COLLATERAL_UTXO]),
    auth: { authenticate: () => undefined } as never,
    ...overrides,
  } as CardanoTransactionSignerContext & { wallet: HardwareWalletLedger });

describe('CardanoLedgerSignerFactory', () => {
  const factory = new CardanoLedgerSignerFactory(dependencies);

  describe('canSign', () => {
    it('returns true for a HardwareLedger Cardano account', () => {
      expect(factory.canSign(ledgerAccount)).toBe(true);
    });

    it('returns false for a non-Cardano HardwareLedger account', () => {
      expect(
        factory.canSign({
          ...ledgerAccount,
          blockchainName: 'Bitcoin',
        } as unknown as AnyAccount),
      ).toBe(false);
    });

    it('returns false for a Cardano account of a different type', () => {
      expect(
        factory.canSign({
          ...ledgerAccount,
          accountType: 'HardwareTrezor',
        } as unknown as AnyAccount),
      ).toBe(false);
    });
  });

  describe('createTransactionSigner', () => {
    it('builds a transaction signer for a supported account', () => {
      expect(typeof factory.createTransactionSigner(buildContext()).sign).toBe(
        'function',
      );
    });

    it('is wrapped by the collateral-ownership guard: a case-(b) transaction is refused and never reaches the inner signer', async () => {
      const innerSign = vi.spyOn(
        CardanoLedgerTransactionSigner.prototype,
        'sign',
      );
      await expectCollateralGuardRefusesCaseB({
        createSigner: ownership =>
          factory.createTransactionSigner(buildContext(ownership)),
        assertNotDelegated: () => {
          expect(innerSign).not.toHaveBeenCalled();
        },
      });
      innerSign.mockRestore();
    });

    it('throws when the account is not found in the wallet', () => {
      const walletWithNoAccounts = {
        ...ledgerWallet,
        accounts: [],
      } as unknown as HardwareWalletLedger;
      expect(() =>
        factory.createTransactionSigner(
          buildContext({ wallet: walletWithNoAccounts }),
        ),
      ).toThrow(/does not support account type/);
    });
  });
});
