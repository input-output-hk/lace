import { Serialization } from '@cardano-sdk/core';
import {
  CardanoInMemoryDataSigner,
  CardanoInMemoryTransactionSigner,
  CollateralOwnershipError,
  collateralRefusalCase,
  createInputResolver,
} from '@lace-contract/cardano-context';
import { WalletType } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import {
  CASE_B_TX,
  FOREIGN_ADDRESS,
  NO_COLLATERAL_TX,
  OWN_COLLATERAL,
  OWN_COLLATERAL_UTXO,
  WALLET_ADDRESS,
  expectCollateralGuardRefusesCaseB,
} from '@lace-lib/util-dev-cardano';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoInMemorySignerFactory } from '../../src/signing/cardano-in-memory-signer-factory';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoSignerContext,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type { SignerAuth } from '@lace-contract/signer';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const mockChainId: Cardano.ChainId = { networkId: 0, networkMagic: 1 };
const mockAccountId = 'account-1' as AccountId;
const mockAuth: SignerAuth = {
  authenticate: vi.fn(),
  accessAuthSecret: vi.fn(),
};

const createMockContext = (walletType: WalletType): CardanoSignerContext => ({
  wallet: {
    type: walletType,
    accounts: [
      {
        accountId: mockAccountId,
        accountType:
          walletType === WalletType.InMemory ? 'InMemory' : walletType,
        blockchainName: 'Cardano',
        blockchainSpecific: {
          accountIndex: 0,
          chainId: mockChainId,
          extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
        },
      },
    ],
    blockchainSpecific: {
      Cardano: {
        encryptedRootPrivateKey: 'beef' as HexBytes,
      },
    },
  } as AnyWallet,
  accountId: mockAccountId,
  knownAddresses: [],
  auth: mockAuth,
});

const createMockTxContext = (
  walletType: WalletType,
): CardanoTransactionSignerContext => ({
  ...createMockContext(walletType),
  utxo: [],
  // Holds the fixture collateral on purpose: this suite never triggers the
  // collateral guard's ownership evaluation, but a resolver that knows
  // nothing would make every collateral input read as own rather than
  // exercising the rule.
  collateralInputResolver: createInputResolver([OWN_COLLATERAL_UTXO]),
});

describe('CardanoInMemorySignerFactory', () => {
  const factory = new CardanoInMemorySignerFactory();

  describe('canSign', () => {
    it('returns true for InMemory Cardano accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(true);
    });

    it('returns false for LazyInMemory Cardano accounts', () => {
      const account = {
        accountType: 'LazyInMemory',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });

    it('returns false for non-InMemory account types', () => {
      const account = {
        accountType: 'HardwareLedger',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });

    it('returns false for non-Cardano accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Bitcoin',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });
  });

  describe('createTransactionSigner', () => {
    it('builds a transaction signer for an InMemory wallet', () => {
      const context = createMockTxContext(WalletType.InMemory);
      expect(typeof factory.createTransactionSigner(context).sign).toBe(
        'function',
      );
    });

    it('is wrapped by the collateral-ownership guard: a case-(b) transaction is refused and never reaches the inner signer', async () => {
      const innerSign = vi.spyOn(
        CardanoInMemoryTransactionSigner.prototype,
        'sign',
      );
      await expectCollateralGuardRefusesCaseB({
        createSigner: ownership =>
          factory.createTransactionSigner({
            ...createMockTxContext(WalletType.InMemory),
            ...ownership,
          }),
        assertNotDelegated: () => {
          expect(innerSign).not.toHaveBeenCalled();
        },
      });
      innerSign.mockRestore();
    });

    // Driven through a real PRODUCTION factory (not a hand-rolled stand-in)
    // with a genuine reserved-vs-available distinction: the collateral
    // resolver's local layer (settled, collateral-reserved UTxOs INCLUDED)
    // holds the collateral input, while the same-shaped "available view" set
    // built alongside it deliberately does NOT. Both are spelled out below.
    it('w1: the wrapped signer blocks a case-(b) fixture whose collateral input is collateral-reserved (present in the settled ownership set, absent from the available view)', async () => {
      const innerSign = vi.spyOn(
        CardanoInMemoryTransactionSigner.prototype,
        'sign',
      );
      // The available/spendable view a real origin would ALSO hold alongside
      // the ownership set (e.g. dapp-connector's `accountUtxos$` /
      // `resolutionUtxos`) -- collateral reservation is exactly what would
      // exclude OWN_COLLATERAL_UTXO from this set in production.
      const availableView: Cardano.Utxo[] = [];
      expect(availableView).not.toContainEqual(OWN_COLLATERAL_UTXO);

      const context: CardanoTransactionSignerContext = {
        ...createMockTxContext(WalletType.InMemory),
        knownAddresses: [
          { address: WALLET_ADDRESS } as unknown as GroupedAddress,
        ],
        // The settled authority as the resolver's local layer: includes the
        // reserved UTxO, so the verdict needs no provider.
        collateralInputResolver: createInputResolver([OWN_COLLATERAL_UTXO]),
      };
      const signer = factory.createTransactionSigner(context);

      await expect(
        firstValueFrom(signer.sign({ serializedTx: HexBytes(CASE_B_TX) })),
      ).rejects.toBeInstanceOf(CollateralOwnershipError);
      expect(innerSign).not.toHaveBeenCalled();

      // The inner signer is stubbed from here on (not exercised for real --
      // the in-memory key agent needs real crypto material this fixture
      // doesn't have) purely to observe delegation.
      innerSign.mockReturnValue(
        of({ serializedTx: HexBytes('deadbeef'), signatureCount: 1 }),
      );

      // Hazard control: wired with the available view as its ONLY layer and
      // no provider behind it, the reserved input is unidentifiable, so it is
      // not ours and this same fixture SIGNS (LW-15506). The ownership set
      // above is what makes the refusal hold.
      const thinSigner = factory.createTransactionSigner({
        ...context,
        collateralInputResolver: createInputResolver(availableView),
      });
      const thinResult = await firstValueFrom(
        thinSigner.sign({ serializedTx: HexBytes(CASE_B_TX) }),
      );
      expect(thinResult.serializedTx).toBe('deadbeef');
      expect(innerSign).toHaveBeenCalledTimes(1);

      // Delegation control: a resolver that PROVES the collateral foreign
      // turns this fixture into case (c).
      const foreignSigner = factory.createTransactionSigner({
        ...context,
        collateralInputResolver: createInputResolver([
          [
            OWN_COLLATERAL_UTXO[0],
            { ...OWN_COLLATERAL_UTXO[1], address: FOREIGN_ADDRESS },
          ] as Cardano.Utxo,
        ]),
      });
      const result = await firstValueFrom(
        foreignSigner.sign({ serializedTx: HexBytes(CASE_B_TX) }),
      );
      expect(result.serializedTx).toBe('deadbeef');
      expect(innerSign).toHaveBeenCalledTimes(2);
      innerSign.mockRestore();
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockTxContext(walletType);
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'CardanoInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when account is not found', () => {
      const context = createMockTxContext(WalletType.InMemory);
      context.accountId = 'non-existent' as AccountId;
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'CardanoInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when wallet is missing Cardano encrypted root private key', () => {
      const context = createMockTxContext(WalletType.InMemory);
      (
        context.wallet as AnyWallet & {
          blockchainSpecific: Record<string, unknown>;
        }
      ).blockchainSpecific = {};
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'Wallet is missing Cardano encrypted root private key',
      );
    });
  });

  describe('createDataSigner', () => {
    it('returns CardanoInMemoryDataSigner for InMemory wallets', () => {
      const context = createMockContext(WalletType.InMemory);
      const signer = factory.createDataSigner(context);
      expect(signer).toBeInstanceOf(CardanoInMemoryDataSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockContext(walletType);
      expect(() => factory.createDataSigner(context)).toThrow(
        'CardanoInMemorySignerFactory does not support account type:',
      );
    });
  });
});

// The seven factory suites all refuse the same fixture, so a fixture that
// blocked under ANY authority would green a broken guard in all of them.
describe('the shared case-(b) fixture', () => {
  const bodyOf = (cbor: string) =>
    Serialization.Transaction.fromCbor(Serialization.TxCBOR(cbor)).toCore()
      .body;
  const ownRef = `${OWN_COLLATERAL.txId}#${OWN_COLLATERAL.index}`;

  it('is refused when its collateral input is own', () => {
    expect(
      collateralRefusalCase(bodyOf(CASE_B_TX), {
        ownUtxoRefs: new Set([ownRef]),
        ownAddresses: new Set([WALLET_ADDRESS]),
      }),
    ).toBe('foreign-collateral-return');
  });

  it('is allowed when its collateral input is NOT own', () => {
    expect(
      collateralRefusalCase(bodyOf(CASE_B_TX), {
        ownUtxoRefs: new Set(),
        ownAddresses: new Set([WALLET_ADDRESS]),
      }),
    ).toBeNull();
  });

  it('leaves the collateral-free control allowed under the refusing authority', () => {
    expect(
      collateralRefusalCase(bodyOf(NO_COLLATERAL_TX), {
        ownUtxoRefs: new Set([ownRef]),
        ownAddresses: new Set([WALLET_ADDRESS]),
      }),
    ).toBeNull();
  });
});
