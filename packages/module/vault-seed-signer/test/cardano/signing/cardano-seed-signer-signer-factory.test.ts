import { createInputResolver } from '@lace-contract/cardano-context';
import {
  OWN_COLLATERAL_UTXO,
  expectCollateralGuardRefusesCaseB,
} from '@lace-lib/util-dev-cardano';
import { describe, expect, it, vi } from 'vitest';

import { CardanoSeedSignerDataSigner } from '../../../src/cardano/signing/cardano-seed-signer-data-signer';
import { CardanoSeedSignerSignerFactory } from '../../../src/cardano/signing/cardano-seed-signer-signer-factory';
import { CardanoSeedSignerTransactionSigner } from '../../../src/cardano/signing/cardano-seed-signer-transaction-signer';

import type {
  CardanoSignerContext,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { AnyAccount, AnyWallet } from '@lace-contract/wallet-repo';

const accountId = 'wallet-1-0-1' as never;

const seedSignerAccount = {
  accountId,
  accountType: 'HardwareSeedSigner',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 },
    extendedAccountPublicKey: '0'.repeat(128),
    masterFingerprint: 'deadbeef',
  },
} as unknown as AnyAccount;

const wallet = {
  walletId: 'wallet-1',
  accounts: [seedSignerAccount],
} as unknown as AnyWallet;

const buildContext = (
  overrides: Partial<CardanoTransactionSignerContext> = {},
): CardanoTransactionSignerContext =>
  ({
    wallet,
    accountId,
    knownAddresses: [],
    utxo: [],
    // Non-empty on purpose: most of this suite never triggers the guard's
    // ownership evaluation, but an empty set would make the guard inert.
    collateralInputResolver: createInputResolver([OWN_COLLATERAL_UTXO]),
    auth: { authenticate: () => undefined },
    ...overrides,
  } as unknown as CardanoTransactionSignerContext);

describe('CardanoSeedSignerSignerFactory', () => {
  const factory = new CardanoSeedSignerSignerFactory();

  describe('canSign', () => {
    it('returns true for a Cardano HardwareSeedSigner account', () => {
      expect(factory.canSign(seedSignerAccount)).toBe(true);
    });

    it('returns false for a non-Cardano HardwareSeedSigner account', () => {
      expect(
        factory.canSign({
          ...seedSignerAccount,
          blockchainName: 'Bitcoin',
        } as unknown as AnyAccount),
      ).toBe(false);
    });

    it('returns false for a Cardano account of a different type', () => {
      expect(
        factory.canSign({
          ...seedSignerAccount,
          accountType: 'HardwareLedger',
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
        CardanoSeedSignerTransactionSigner.prototype,
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

    it('throws for an account it cannot sign', () => {
      const unsupportedWallet = {
        walletId: 'wallet-1',
        accounts: [{ ...seedSignerAccount, accountType: 'HardwareLedger' }],
      } as unknown as AnyWallet;
      expect(() =>
        factory.createTransactionSigner(
          buildContext({ wallet: unsupportedWallet }),
        ),
      ).toThrow(/does not support account type/);
    });

    it('throws when the account is missing from the wallet', () => {
      const emptyWallet = {
        walletId: 'wallet-1',
        accounts: [],
      } as unknown as AnyWallet;
      expect(() =>
        factory.createTransactionSigner(buildContext({ wallet: emptyWallet })),
      ).toThrow(/unknown/);
    });
  });

  describe('createDataSigner', () => {
    it('builds a data signer for a supported account', () => {
      const signer = factory.createDataSigner(
        buildContext() as unknown as CardanoSignerContext,
      );
      expect(signer).toBeInstanceOf(CardanoSeedSignerDataSigner);
    });
  });
});
