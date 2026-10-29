import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { AuthenticationCancelledError } from '@lace-contract/signer';
import { HexBytes } from '@lace-lib/util';
import {
  buildBitcoinPayment,
  getExtendedPubKeys,
  signBitcoinTransactionWithSeed,
} from '@lace-module/blockchain-bitcoin/sdk';
import * as bip39 from 'bip39';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinLazyInMemorySignerFactory } from '../src/bitcoin/bitcoin-lazy-in-memory-signer-factory';
import { createBitcoinLazyInMemoryVaultModule } from '../src/bitcoin/create-bitcoin-lazy-in-memory-vault-module';
import { LazyWalletMismatchError } from '../src/lazy-wallet-mismatch-error';

import type { WithMnemonicWords } from '../src/cardano-lazy-in-memory-signer-factory';
import type { BitcoinSignerContext } from '@lace-contract/bitcoin-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
  WalletId,
} from '@lace-contract/wallet-repo';
import type * as BitcoinSdk from '@lace-module/blockchain-bitcoin/sdk';
import type * as Bip39 from 'bip39';

const derivedSeeds = vi.hoisted(() => [] as Buffer[]);
const seedGate = vi.hoisted(() => ({
  pending: undefined as Promise<void> | undefined,
}));

vi.mock('bip39', async importOriginal => {
  const actual = await importOriginal<typeof Bip39>();
  return {
    ...actual,
    mnemonicToSeed: async (mnemonic: string, password?: string) => {
      await seedGate.pending;
      const seed = await actual.mnemonicToSeed(mnemonic, password);
      derivedSeeds.push(seed);
      return seed;
    },
  };
});

vi.mock('@lace-module/blockchain-bitcoin/sdk', async importOriginal => {
  const actual = await importOriginal<typeof BitcoinSdk>();
  return {
    ...actual,
    signBitcoinTransactionWithSeed: vi.fn(
      actual.signBitcoinTransactionWithSeed,
    ),
  };
});

const words =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'.split(
    ' ',
  );
const otherWords =
  'legal winner thank year wave sausage worth useful legal winner thank yellow'.split(
    ' ',
  );
/** The BIP-84 test vector's testnet account 0, external address 0. */
const ownedAddress = {
  address: 'tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl',
  addressType: 'NativeSegWit',
  network: BitcoinNetwork.Testnet,
  account: 0,
  chain: 'external',
  index: 0,
  publicKeyHex:
    '02e7ab2537b5d49e970309aae06e9e49f36ce1c9febbd44ec8e0d1cca0b4f9c319',
};
/** The BIP-84 test vector's testnet account 0, external address 1. */
const recipientAddress = 'tb1qd7spv5q28348xl4myc8zmh983w5jx32cjhkn97';

const accountId = 'wallet-1-0-testnet4' as AccountId;
const seedOf = (mnemonic: readonly string[]) =>
  bip39.mnemonicToSeedSync(mnemonic.join(' '));
const storedKeys = getExtendedPubKeys(seedOf(words), 0);

const lazyAccount = {
  accountId,
  accountType: 'LazyInMemory',
  blockchainName: 'Bitcoin',
  blockchainNetworkId: BitcoinNetworkId(BitcoinNetwork.Testnet),
  networkType: 'testnet',
  blockchainSpecific: {
    accountIndex: 0,
    extendedAccountPublicKeys: storedKeys.testnet4,
    networkId: BitcoinNetworkId(BitcoinNetwork.Testnet),
  },
} as unknown as AnyAccount;

const buildContext = (
  overrides: Partial<BitcoinSignerContext> = {},
): BitcoinSignerContext => ({
  wallet: {
    walletId: 'wallet-1' as WalletId,
    accounts: [lazyAccount],
  } as unknown as AnyWallet,
  accountId,
  auth: {
    authenticate: vi.fn(() => of(true)),
    accessAuthSecret: vi.fn(),
  },
  ...overrides,
});

const buildUnsignedTx = async (): Promise<HexBytes> => {
  const payment = await buildBitcoinPayment({
    wallet: {
      network: BitcoinNetwork.Testnet,
      address: ownedAddress,
      utxos$: of([
        {
          txId: '1d9245e858a53a79c1fed40deb9666f782f688113b9a5b2bdc01dc016953ed34',
          index: 0,
          satoshis: 10_000_000,
          address: ownedAddress.address,
          script: '',
          confirmations: 1,
          height: 0,
          runes: [],
          inscriptions: [],
        },
      ]),
      addresses$: of([ownedAddress]),
    } as never,
    pendingActivities: [],
    outputs: [{ address: recipientAddress, amount: 1000 }],
    feeRate: { feeOption: 'Custom', customFeeRate: 0.001 },
  });
  return payment.serializedTx;
};

const withWords =
  (mnemonic: readonly string[]): WithMnemonicWords =>
  async use =>
    use(mnemonic);

const isWiped = (seed: Buffer) => seed.every(byte => byte === 0);

describe('BitcoinLazyInMemorySignerFactory', () => {
  beforeEach(() => {
    derivedSeeds.length = 0;
    seedGate.pending = undefined;
    vi.mocked(signBitcoinTransactionWithSeed).mockClear();
  });

  it('canSign matches only a Bitcoin LazyInMemory account', () => {
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });

    expect(factory.canSign(lazyAccount)).toBe(true);
    expect(
      factory.canSign({
        ...lazyAccount,
        accountType: 'InMemory',
      } as AnyAccount),
    ).toBe(false);
    expect(
      factory.canSign({
        ...lazyAccount,
        blockchainName: 'Cardano',
      } as AnyAccount),
    ).toBe(false);
  });

  it('refuses to build a signer for an unsupported account', () => {
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });

    expect(() =>
      factory.createTransactionSigner(
        buildContext({
          wallet: {
            walletId: 'wallet-1' as WalletId,
            accounts: [{ ...lazyAccount, accountType: 'InMemory' }],
          } as unknown as AnyWallet,
        }),
      ),
    ).toThrow('does not support account type: InMemory');
  });

  it('does not sign data', () => {
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });

    expect(() => factory.createDataSigner(buildContext())).toThrow(
      'Data signing is not supported for lazy Bitcoin accounts.',
    );
  });

  it('signs like the seed of the same words and wipes the seed', async () => {
    const serializedTx = await buildUnsignedTx();
    let isActive = false;
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: async use => {
        isActive = true;
        try {
          return await use(words);
        } finally {
          isActive = false;
        }
      },
    });
    const context = buildContext();

    const result = await firstValueFrom(
      factory.createTransactionSigner(context).sign({ serializedTx }),
    );

    expect(result).toEqual(
      signBitcoinTransactionWithSeed(serializedTx, seedOf(words)),
    );
    expect(context.auth.authenticate).toHaveBeenCalledTimes(1);
    expect(context.auth.accessAuthSecret).not.toHaveBeenCalled();
    expect(isActive).toBe(false);
    expect(derivedSeeds).toHaveLength(1);
    expect(isWiped(derivedSeeds[0])).toBe(true);
  });

  it('signs a mainnet account with its mainnet keys', async () => {
    const serializedTx = await buildUnsignedTx();
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });
    const mainnetAccount = {
      ...lazyAccount,
      blockchainNetworkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: storedKeys.mainnet,
        networkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
      },
    };

    const result = await firstValueFrom(
      factory
        .createTransactionSigner(
          buildContext({
            wallet: {
              walletId: 'wallet-1' as WalletId,
              accounts: [mainnetAccount],
            } as unknown as AnyWallet,
          }),
        )
        .sign({ serializedTx }),
    );

    expect(result).toEqual(
      signBitcoinTransactionWithSeed(serializedTx, seedOf(words)),
    );
  });

  it('rejects a testnet account that stores the mainnet keys', async () => {
    const serializedTx = await buildUnsignedTx();
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });
    const mismatchedAccount = {
      ...lazyAccount,
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: storedKeys.mainnet,
        networkId: BitcoinNetworkId(BitcoinNetwork.Testnet),
      },
    };

    await expect(
      firstValueFrom(
        factory
          .createTransactionSigner(
            buildContext({
              wallet: {
                walletId: 'wallet-1' as WalletId,
                accounts: [mismatchedAccount],
              } as unknown as AnyWallet,
            }),
          )
          .sign({ serializedTx }),
      ),
    ).rejects.toThrow(LazyWalletMismatchError);
    expect(signBitcoinTransactionWithSeed).not.toHaveBeenCalled();
  });

  it('resolves the network from the blockchain network id as a fallback', async () => {
    const serializedTx = await buildUnsignedTx();
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });
    const accountWithoutNetworkId = {
      ...lazyAccount,
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: storedKeys.testnet4,
      },
    };

    const result = await firstValueFrom(
      factory
        .createTransactionSigner(
          buildContext({
            wallet: {
              walletId: 'wallet-1' as WalletId,
              accounts: [accountWithoutNetworkId],
            } as unknown as AnyWallet,
          }),
        )
        .sign({ serializedTx }),
    );

    expect(result).toEqual(
      signBitcoinTransactionWithSeed(serializedTx, seedOf(words)),
    );
  });

  it('rejects words of another wallet without signing and wipes the seed', async () => {
    const serializedTx = await buildUnsignedTx();
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(otherWords),
    });

    await expect(
      firstValueFrom(
        factory.createTransactionSigner(buildContext()).sign({ serializedTx }),
      ),
    ).rejects.toThrow(LazyWalletMismatchError);
    expect(signBitcoinTransactionWithSeed).not.toHaveBeenCalled();
    expect(derivedSeeds).toHaveLength(1);
    expect(isWiped(derivedSeeds[0])).toBe(true);
  });

  it('rejects matching words used with another account index', async () => {
    const serializedTx = await buildUnsignedTx();
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });
    const secondAccount = {
      ...lazyAccount,
      blockchainSpecific: {
        accountIndex: 1,
        extendedAccountPublicKeys: storedKeys.testnet4,
        networkId: BitcoinNetworkId(BitcoinNetwork.Testnet),
      },
    };

    await expect(
      firstValueFrom(
        factory
          .createTransactionSigner(
            buildContext({
              wallet: {
                walletId: 'wallet-1' as WalletId,
                accounts: [secondAccount],
              } as unknown as AnyWallet,
            }),
          )
          .sign({ serializedTx }),
      ),
    ).rejects.toThrow(LazyWalletMismatchError);
  });

  it('wipes the seed when signing fails', async () => {
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: withWords(words),
    });

    await expect(
      firstValueFrom(
        factory
          .createTransactionSigner(buildContext())
          .sign({ serializedTx: HexBytes.fromUTF8('not a tx') }),
      ),
    ).rejects.toThrow();
    expect(derivedSeeds).toHaveLength(1);
    expect(isWiped(derivedSeeds[0])).toBe(true);
  });

  it('does not ask for the words when authentication is declined', async () => {
    let didAskForWords = false;
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: async use => {
        didAskForWords = true;
        return use(words);
      },
    });

    await expect(
      firstValueFrom(
        factory
          .createTransactionSigner(
            buildContext({
              auth: {
                authenticate: () => of(false),
                accessAuthSecret: vi.fn(),
              },
            }),
          )
          .sign({ serializedTx: await buildUnsignedTx() }),
      ),
    ).rejects.toThrow(AuthenticationCancelledError);
    expect(didAskForWords).toBe(false);
  });

  it('does not derive or sign after unsubscribe while the words are pending', async () => {
    let releaseWords!: () => void;
    const pendingWords = new Promise<void>(resolve => {
      releaseWords = resolve;
    });
    let didRead = false;
    const trackedWords = new Proxy([...words], {
      get: (target, property, receiver) => {
        if (property === 'join') didRead = true;
        return Reflect.get(target, property, receiver) as unknown;
      },
    });
    let didAskForWords = false;
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: async use => {
        didAskForWords = true;
        await pendingWords;
        return use(trackedWords);
      },
    });
    const next = vi.fn();
    const error = vi.fn();
    const subscription = factory
      .createTransactionSigner(buildContext())
      .sign({ serializedTx: await buildUnsignedTx() })
      .subscribe({ next, error });
    for (let index = 0; index < 10 && !didAskForWords; index++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    expect(didAskForWords).toBe(true);
    subscription.unsubscribe();
    releaseWords();
    await pendingWords;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(didRead).toBe(false);
    expect(derivedSeeds).toHaveLength(0);
    expect(signBitcoinTransactionWithSeed).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('wipes the seed and does not sign after unsubscribe while the seed is pending', async () => {
    let releaseSeed!: () => void;
    seedGate.pending = new Promise<void>(resolve => {
      releaseSeed = resolve;
    });
    let didSupplyWords = false;
    const factory = new BitcoinLazyInMemorySignerFactory({
      withMnemonicWords: async use => {
        didSupplyWords = true;
        return use(words);
      },
    });
    const next = vi.fn();
    const error = vi.fn();
    const subscription = factory
      .createTransactionSigner(buildContext())
      .sign({ serializedTx: await buildUnsignedTx() })
      .subscribe({ next, error });
    for (let index = 0; index < 10 && !didSupplyWords; index++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    expect(didSupplyWords).toBe(true);
    subscription.unsubscribe();
    releaseSeed();
    for (let index = 0; index < 50 && derivedSeeds.length === 0; index++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(derivedSeeds).toHaveLength(1);
    expect(isWiped(derivedSeeds[0])).toBe(true);
    expect(signBitcoinTransactionWithSeed).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe('createBitcoinLazyInMemoryVaultModule', () => {
  it('provides the lazy Bitcoin signer factory', async () => {
    const module = createBitcoinLazyInMemoryVaultModule({
      withMnemonicWords: withWords(words),
    });
    const factory = await (
      await module.addons.loadSignerFactory()
    ).default({} as never, {} as never);

    expect(module.moduleName).toBe('bitcoin-lazy-in-memory-vault');
    expect(factory).toBeInstanceOf(BitcoinLazyInMemorySignerFactory);
    expect(factory.canSign(lazyAccount)).toBe(true);
  });
});
