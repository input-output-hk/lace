import { Cardano as CardanoCore, Serialization } from '@cardano-sdk/core';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromMnemonic,
  createInputResolver,
} from '@lace-contract/cardano-context';
import { expectCollateralGuardRefusesCaseB } from '@lace-lib/util-dev-cardano';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CardanoLazyInMemorySignerFactory } from '../src/cardano-lazy-in-memory-signer-factory';
import { LazyWalletMismatchError } from '../src/lazy-wallet-mismatch-error';
import { createPasskeyVaultModule } from '../src/passkey-vault-module';

import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoTransactionSignerContext } from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type { PasskeyKeySource } from '@lace-lib/passkey';

const accountId = 'wallet-1-0-1' as AccountId;

const lazyAccount = {
  accountId,
  accountType: 'LazyInMemory',
  blockchainName: 'Cardano',
  blockchainSpecific: {
    accountIndex: 0,
    chainId: { networkId: 0, networkMagic: 1 },
    extendedAccountPublicKey: '0'.repeat(128),
  },
} as unknown as AnyAccount;

const wallet = {
  walletId: 'wallet-1' as WalletId,
  accounts: [lazyAccount],
} as unknown as AnyWallet;

const buildContext = (
  overrides: Partial<CardanoTransactionSignerContext> = {},
): CardanoTransactionSignerContext => ({
  wallet,
  accountId,
  knownAddresses: [] as GroupedAddress[],
  utxo: [] as Cardano.Utxo[],
  collateralInputResolver: createInputResolver([]),
  auth: { authenticate: () => undefined } as never,
  ...overrides,
});

describe('CardanoLazyInMemorySignerFactory', () => {
  const factory = new CardanoLazyInMemorySignerFactory({
    withMnemonicWords: async use => use([]),
  });

  it('canSign matches a Cardano LazyInMemory account', () => {
    expect(factory.canSign(lazyAccount)).toBe(true);
    expect(
      factory.canSign({
        ...lazyAccount,
        blockchainName: 'Bitcoin',
      } as unknown as AnyAccount),
    ).toBe(false);
  });

  it('builds a transaction signer for a supported account', () => {
    expect(typeof factory.createTransactionSigner(buildContext()).sign).toBe(
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
        factory.createTransactionSigner(buildContext(ownership)),
      assertNotDelegated: () => {
        expect(innerSign).not.toHaveBeenCalled();
      },
    });
    innerSign.mockRestore();
  });

  it('keeps each fresh assertion open through signing and rejects a different signing key', async () => {
    const words =
      'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
        ' ',
      );
    const xpub =
      '928f23856ef3f6edc6adc14d7fb39b15cfb985b9bb038755158cf2ad6cdd8281d601bb8f919e2feb0183b1462a59fce5c7acde2cf10ccd10e213d02ff0d0a7a7';
    const address =
      'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh';
    let isInside = false;
    let assertions = 0;
    const source = await (
      await createPasskeyVaultModule({
        keySource: {
          withPasskeyMnemonic: async use => {
            assertions += 1;
            isInside = true;
            try {
              const result = await use(words);
              expect(isInside).toBe(true);
              return result;
            } finally {
              isInside = false;
            }
          },
        } as PasskeyKeySource,
      }).addons.loadSignerFactory()
    ).default({} as never, {} as never);
    const tx = Serialization.Transaction.fromCore({
      id: 'ef'.repeat(32) as CardanoCore.TransactionId,
      body: {
        inputs: [
          { txId: 'cd'.repeat(32) as CardanoCore.TransactionId, index: 0 },
        ],
        outputs: [
          {
            address: address as CardanoCore.PaymentAddress,
            value: { coins: 1_000_000n },
          },
        ],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    } as CardanoCore.Tx).toCbor();
    const account = {
      ...lazyAccount,
      blockchainSpecific: {
        accountIndex: 0,
        chainId: CardanoCore.ChainIds.Preprod,
        extendedAccountPublicKey: xpub,
      },
    };
    const signer = source.createTransactionSigner(
      buildContext({
        wallet: { ...wallet, accounts: [account] } as unknown as AnyWallet,
        auth: { authenticate: () => of(true) } as never,
      }),
    );
    await firstValueFrom(signer.sign({ serializedTx: tx as never }));
    expect(isInside).toBe(false);
    await firstValueFrom(signer.sign({ serializedTx: tx as never }));
    expect(assertions).toBe(2);

    const wrong = source.createTransactionSigner(
      buildContext({
        wallet: {
          ...wallet,
          accounts: [
            {
              ...account,
              blockchainSpecific: {
                ...account.blockchainSpecific,
                extendedAccountPublicKey: '0'.repeat(128),
              },
            },
          ],
        } as unknown as AnyWallet,
        auth: { authenticate: () => of(true) } as never,
      }),
    );
    await expect(
      firstValueFrom(wrong.sign({ serializedTx: tx as never })),
    ).rejects.toThrow(LazyWalletMismatchError);

    const secondAgent = await createCardanoKeyAgentFromMnemonic({
      accountIndex: 1,
      chainId: CardanoCore.ChainIds.Preprod,
      mnemonicWords: words,
    });
    const secondKey = secondAgent.extendedAccountPublicKey;
    secondAgent.dispose?.();
    expect(secondKey).not.toBe(xpub);
    const second = source.createTransactionSigner(
      buildContext({
        wallet: {
          ...wallet,
          accounts: [
            {
              ...account,
              blockchainSpecific: {
                ...account.blockchainSpecific,
                accountIndex: 1,
                extendedAccountPublicKey: secondKey,
              },
            },
          ],
        } as unknown as AnyWallet,
        auth: { authenticate: () => of(true) } as never,
      }),
    );
    await expect(
      firstValueFrom(second.sign({ serializedTx: tx as never })),
    ).resolves.toBeDefined();
  });

  it('does not derive or sign after unsubscribe while assertion is pending', async () => {
    let releaseAssertion!: () => void;
    const pendingAssertion = new Promise<void>(resolve => {
      releaseAssertion = resolve;
    });
    let didRead = false;
    const words = new Proxy(['fame'], {
      get: (target, property, receiver) => {
        if (property === Symbol.iterator) didRead = true;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    let didEnterAssertion = false;
    const source = new CardanoLazyInMemorySignerFactory({
      withMnemonicWords: async use => {
        didEnterAssertion = true;
        await pendingAssertion;
        return use(words);
      },
    });
    const tx = Serialization.Transaction.fromCore({
      id: 'ef'.repeat(32) as CardanoCore.TransactionId,
      body: {
        inputs: [
          { txId: 'cd'.repeat(32) as CardanoCore.TransactionId, index: 0 },
        ],
        outputs: [
          {
            address:
              'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh' as CardanoCore.PaymentAddress,
            value: { coins: 1_000_000n },
          },
        ],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    } as CardanoCore.Tx).toCbor();
    const signer = source.createTransactionSigner(
      buildContext({
        auth: { authenticate: () => of(true) } as never,
      }),
    );
    const next = vi.fn();
    const error = vi.fn();
    const subscription = signer
      .sign({ serializedTx: tx as never })
      .subscribe({ next, error });
    for (let index = 0; index < 10 && !didEnterAssertion; index++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(didEnterAssertion).toBe(true);
    subscription.unsubscribe();
    releaseAssertion();
    await pendingAssertion;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(didRead).toBe(false);
    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('signs with a passkey on mainnet using one assertion and the selected account key', async () => {
    const words =
      'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
        ' ',
      );
    const assertion = vi.fn(
      async <T>(use: (words: readonly string[]) => Promise<T>): Promise<T> =>
        use(words),
    );
    const source = await (
      await createPasskeyVaultModule({
        keySource: {
          withPasskeyMnemonic: assertion,
        } as unknown as PasskeyKeySource,
      }).addons.loadSignerFactory()
    ).default({} as never, {} as never);
    const mainnet = {
      ...lazyAccount,
      blockchainSpecific: {
        accountIndex: 0,
        chainId: CardanoCore.ChainIds.Mainnet,
        extendedAccountPublicKey:
          '928f23856ef3f6edc6adc14d7fb39b15cfb985b9bb038755158cf2ad6cdd8281d601bb8f919e2feb0183b1462a59fce5c7acde2cf10ccd10e213d02ff0d0a7a7',
      },
    };
    const signer = source.createTransactionSigner(
      buildContext({
        wallet: { ...wallet, accounts: [mainnet] } as unknown as AnyWallet,
        auth: { authenticate: () => of(true) } as never,
      }),
    );
    const tx = Serialization.Transaction.fromCore({
      id: 'ef'.repeat(32) as CardanoCore.TransactionId,
      body: {
        inputs: [
          { txId: 'cd'.repeat(32) as CardanoCore.TransactionId, index: 0 },
        ],
        outputs: [
          {
            address:
              'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh' as CardanoCore.PaymentAddress,
            value: { coins: 1_000_000n },
          },
        ],
        fee: 170_000n,
      },
      witness: { signatures: new Map() },
    } as CardanoCore.Tx).toCbor();
    await expect(
      firstValueFrom(signer.sign({ serializedTx: tx as never })),
    ).resolves.toBeDefined();
    expect(assertion).toHaveBeenCalledTimes(1);

    const mismatchedSigner = source.createTransactionSigner(
      buildContext({
        wallet: {
          ...wallet,
          accounts: [
            {
              ...mainnet,
              blockchainSpecific: {
                ...mainnet.blockchainSpecific,
                extendedAccountPublicKey: '0'.repeat(128),
              },
            },
          ],
        } as unknown as AnyWallet,
        auth: { authenticate: () => of(true) } as never,
      }),
    );
    await expect(
      firstValueFrom(mismatchedSigner.sign({ serializedTx: tx as never })),
    ).rejects.toThrow(LazyWalletMismatchError);
    expect(assertion).toHaveBeenCalledTimes(2);
  });

  it.each([
    { description: 'signs a matching', matches: true },
    { description: 'rejects a mismatched', matches: false },
  ])(
    '$description standard mnemonic wallet on mainnet within its callback',
    async ({ matches }) => {
      const words =
        'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
          ' ',
        );
      let isActive = false;
      const source = new CardanoLazyInMemorySignerFactory({
        withMnemonicWords: async use => {
          isActive = true;
          try {
            return await use(words);
          } finally {
            isActive = false;
          }
        },
      });
      const mainnet = {
        ...lazyAccount,
        blockchainSpecific: {
          accountIndex: 0,
          chainId: CardanoCore.ChainIds.Mainnet,
          extendedAccountPublicKey: matches
            ? '928f23856ef3f6edc6adc14d7fb39b15cfb985b9bb038755158cf2ad6cdd8281d601bb8f919e2feb0183b1462a59fce5c7acde2cf10ccd10e213d02ff0d0a7a7'
            : '0'.repeat(128),
        },
      };
      const signer = source.createTransactionSigner(
        buildContext({
          wallet: { ...wallet, accounts: [mainnet] } as unknown as AnyWallet,
          auth: { authenticate: () => of(true) } as never,
        }),
      );
      const tx = Serialization.Transaction.fromCore({
        id: 'ef'.repeat(32) as CardanoCore.TransactionId,
        body: {
          inputs: [
            { txId: 'cd'.repeat(32) as CardanoCore.TransactionId, index: 0 },
          ],
          outputs: [
            {
              address:
                'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh' as CardanoCore.PaymentAddress,
              value: { coins: 1_000_000n },
            },
          ],
          fee: 170_000n,
        },
        witness: { signatures: new Map() },
      } as CardanoCore.Tx).toCbor();
      const signing = firstValueFrom(
        signer.sign({ serializedTx: tx as never }),
      );
      if (matches) {
        await expect(signing).resolves.toBeDefined();
      } else {
        await expect(signing).rejects.toThrow(LazyWalletMismatchError);
      }
      expect(isActive).toBe(false);
    },
  );
});
