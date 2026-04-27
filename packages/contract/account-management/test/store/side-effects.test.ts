/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BlockchainNetworkId } from '@lace-contract/network';
import { viewsActions } from '@lace-contract/views';
import { AccountId, WalletId, WalletType } from '@lace-contract/wallet-repo';
import { walletsActions } from '@lace-contract/wallet-repo';
import { SheetRoutes, StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { testSideEffect } from '@lace-lib/util-dev';
import { HardwareIntegrationId } from '@lace-lib/util-hw';
import { HexBytes } from '@lace-sdk/util';
import { firstValueFrom, of, throwError } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock emip3decrypt for testing new blockchain initialization
vi.mock('@cardano-sdk/key-management', async importOriginal => {
  const original = await importOriginal<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('@cardano-sdk/key-management')
  >();
  return {
    ...original,
    emip3decrypt: vi.fn().mockResolvedValue(
      // Returns bytes that decode to "word1 word2 word3" recovery phrase
      new TextEncoder().encode('word1 word2 word3'),
    ),
    emip3encrypt: vi
      .fn()
      .mockResolvedValue(new Uint8Array([0xde, 0xad, 0xbe, 0xef])),
  };
});

import { accountManagementActions } from '../../src';
import {
  createInMemoryWalletAddAccountSideEffect,
  createAddAccountSideEffect,
  createHardwareWalletCreationSideEffect,
  createRemoveAccountSideEffect,
  createRemoveAccountNavigationSideEffect,
  createRemoveWalletNavigationSideEffect,
  createRemoveWalletSideEffect,
  createAccountAddedSuccessSheetSideEffect,
  createWalletCreationSideEffect,
} from '../../src/store/side-effects';

import type { TranslationKey } from '@lace-contract/i18n';
import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { SecureStore } from '@lace-contract/secure-store';
import type {
  AnyWallet,
  HardwareWallet,
  InMemoryWallet,
} from '@lace-contract/wallet-repo';

type BlockchainSpecific = { some: string };

const createMockIntegrations = (
  addAccountsMock: ReturnType<typeof vi.fn>,
): InMemoryWalletIntegration[] => [
  {
    blockchainName: 'Cardano',
    Icon: () => null,
    initializeWallet: vi.fn(),
    createAccounts: vi.fn(),
    addAccounts: addAccountsMock,
  } as unknown as InMemoryWalletIntegration,
];

const actions = {
  ...accountManagementActions,
  ...walletsActions,
  ...viewsActions,
};

describe('createInMemoryWalletAddAccountSideEffect', () => {
  const walletId = WalletId('w1');
  const blockchain = 'Cardano';
  const accountIndex = 2;
  const cardanoNetworkId = BlockchainNetworkId('cardano-764824073');
  const targetNetworks = new Set([cardanoNetworkId]);
  const authenticationPromptConfig = {
    cancellable: true,
    confirmButtonLabel:
      'authentication-prompt.confirm-button-label.add-account' as TranslationKey,
    message: 'authentication-prompt.message.add-account' as TranslationKey,
  };

  let authenticate: ReturnType<typeof vi.fn>;
  let accessAuthSecret: ReturnType<typeof vi.fn>;
  let addAccountMock: ReturnType<typeof vi.fn>;

  const baseWallet: InMemoryWallet<BlockchainSpecific> = {
    walletId,
    metadata: { name: 'Wallet 1', order: 0 },
    accounts: [
      {
        accountId: AccountId('0'),
        walletId,
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
        metadata: { name: 'Acc #0' },
        blockchainSpecific: { some: 'context' },
        accountType: 'InMemory',
      },
    ],
    blockchainSpecific: {
      Cardano: { encryptedRootPrivateKey: HexBytes('abc123') },
    },
    type: WalletType.InMemory,
    encryptedRecoveryPhrase: HexBytes('00'),
    isPassphraseConfirmed: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authenticate = vi.fn(() => of(true));
    accessAuthSecret = vi.fn((callback: (secret: Uint8Array) => unknown) =>
      callback(new Uint8Array([0, 0, 0, 0])),
    );

    addAccountMock = vi.fn();
  });

  it('prompts for password, adds account, and dispatches updateWallet and accountAdded on success', async () => {
    const newAccount = {
      blockchainName: blockchain,
      accountId: AccountId('1'),
    };
    // addAccounts returns { wallet } with merged accounts
    addAccountMock.mockResolvedValue({
      wallet: {
        ...baseWallet,
        accounts: [...baseWallet.accounts, newAccount],
      },
    });

    const emissions: unknown[] = [];

    const sideEffect = createInMemoryWalletAddAccountSideEffect(
      createMockIntegrations(addAccountMock),
    );

    const sideEffect$ = sideEffect(
      {
        accountManagement: {
          attemptAddInMemoryWalletAccount$: of(
            actions.accountManagement.attemptAddInMemoryWalletAccount({
              walletId,
              blockchain,
              accountIndex,
              authenticationPromptConfig,
              accountName: '',
              targetNetworks,
            }),
          ),
        },
      } as never,
      {
        wallets: { selectAll$: of([baseWallet]) },
        network: {
          selectActiveNetworkId$: of(() =>
            BlockchainNetworkId('cardano-764824073'),
          ),
        },
      } as never,
      {
        actions,
        authenticate,
        accessAuthSecret,
        logger: dummyLogger,
      } as never,
    );

    await new Promise<void>(resolve => {
      sideEffect$.subscribe({
        next: action => {
          emissions.push(action);
        },
        complete: () => {
          resolve();
        },
      });
    });

    expect(emissions).toHaveLength(2);
    expect(emissions[0]).toEqual(
      actions.wallets.updateWallet({
        id: walletId,
        changes: {
          accounts: [...baseWallet.accounts, newAccount] as never,
          blockchainSpecific: baseWallet.blockchainSpecific as never,
        },
      }),
    );
    expect(emissions[1]).toMatchObject({
      type: 'accountManagement/accountAdded',
      payload: {
        walletId,
        blockchain,
        accountIndex,
      },
    });

    expect(authenticate).toHaveBeenCalledWith(authenticationPromptConfig);

    expect(addAccountMock).toHaveBeenCalledWith(
      {
        wallet: baseWallet,
        accountIndex,
        password: expect.any(Uint8Array),
        accountName: '',
        targetNetworks,
      },
      { logger: dummyLogger },
    );
  });

  it('includes suppression flag in accountAdded when requested', async () => {
    const newAccount = {
      blockchainName: blockchain,
      accountId: AccountId('1'),
    };
    addAccountMock.mockResolvedValue({
      wallet: {
        ...baseWallet,
        accounts: [...baseWallet.accounts, newAccount],
      },
    });

    const emissions: unknown[] = [];

    const sideEffect = createInMemoryWalletAddAccountSideEffect(
      createMockIntegrations(addAccountMock),
    );

    const sideEffect$ = sideEffect(
      {
        accountManagement: {
          attemptAddInMemoryWalletAccount$: of(
            actions.accountManagement.attemptAddInMemoryWalletAccount({
              walletId,
              blockchain,
              accountIndex,
              authenticationPromptConfig,
              accountName: '',
              targetNetworks,
              shouldSuppressAccountStatus: true,
            }),
          ),
        },
      } as never,
      {
        wallets: { selectAll$: of([baseWallet]) },
        network: {
          selectActiveNetworkId$: of(() =>
            BlockchainNetworkId('cardano-764824073'),
          ),
        },
      } as never,
      {
        actions,
        authenticate,
        accessAuthSecret,
        logger: dummyLogger,
      } as never,
    );

    await new Promise<void>(resolve => {
      sideEffect$.subscribe({
        next: action => {
          emissions.push(action);
        },
        complete: () => {
          resolve();
        },
      });
    });

    expect(emissions).toHaveLength(2);
    expect(emissions[1]).toMatchObject({
      type: 'accountManagement/accountAdded',
      payload: {
        walletId,
        blockchain,
        accountIndex,
        shouldSuppressAccountStatus: true,
      },
    });
  });

  it('does nothing when walletId is not found (logs warning, no prompt, no addAccount)', () => {
    const logger = { ...dummyLogger, warn: vi.fn() };

    testSideEffect(
      createInMemoryWalletAddAccountSideEffect(
        createMockIntegrations(addAccountMock),
      ),
      ({ cold, hot, expectObservable, flush }) => {
        const otherWallet: InMemoryWallet<BlockchainSpecific> = {
          ...baseWallet,
          walletId: WalletId('w2'),
        };
        const wallets$ = hot('a', { a: [otherWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddInMemoryWalletAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: wallets$ },
            network: {
              selectActiveNetworkId$: of(() =>
                BlockchainNetworkId('cardano-764824073'),
              ),
            },
          },
          dependencies: {
            actions,
            authenticate,
            accessAuthSecret,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
            flush();

            expect(authenticate).not.toHaveBeenCalled();
            expect(addAccountMock).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
              'Wallet not found for adding account',
              expect.objectContaining({ walletId }),
            );
          },
        };
      },
    );
  });

  it('emits attemptAddAccountFailed when trying to add account for blockchain without integration', async () => {
    const emissions: unknown[] = [];

    // Only Cardano integration exists, trying to add Bitcoin
    const sideEffect = createInMemoryWalletAddAccountSideEffect(
      createMockIntegrations(addAccountMock),
    );

    const sideEffect$ = sideEffect(
      {
        accountManagement: {
          attemptAddInMemoryWalletAccount$: of(
            actions.accountManagement.attemptAddInMemoryWalletAccount({
              walletId,
              blockchain: 'Bitcoin',
              accountIndex,
              authenticationPromptConfig,
              accountName: '',
              targetNetworks: new Set([BlockchainNetworkId('bitcoin-mainnet')]),
            }),
          ),
        },
      } as never,
      {
        wallets: { selectAll$: of([baseWallet]) },
        network: {
          selectActiveNetworkId$: of(() =>
            BlockchainNetworkId('cardano-764824073'),
          ),
        },
      } as never,
      {
        actions,
        authenticate,
        accessAuthSecret,
        logger: dummyLogger,
      } as never,
    );

    await new Promise<void>(resolve => {
      sideEffect$.subscribe({
        next: action => {
          emissions.push(action);
        },
        complete: () => {
          resolve();
        },
      });
    });

    // Should fail because no Bitcoin integration and wallet doesn't have Bitcoin blockchainSpecific
    expect(emissions).toHaveLength(1);
    expect(emissions[0]).toEqual(
      actions.accountManagement.attemptAddAccountFailed({ walletId }),
    );
  });

  it('initializes new blockchain when adding account for blockchain not yet on wallet', async () => {
    const newBitcoinAccount = {
      blockchainName: 'Bitcoin',
      accountId: AccountId('btc-0'),
      walletId,
      networkType: 'mainnet',
      blockchainNetworkId: BlockchainNetworkId('bitcoin-mainnet'),
      metadata: { name: 'Bitcoin Account #0' },
      blockchainSpecific: { xpub: 'test-xpub' },
      accountType: 'InMemory',
    };

    const bitcoinBlockchainSpecificData = {
      encryptedRootPrivateKey: HexBytes('btc-root-key'),
    };

    // addAccounts returns { wallet } with merged accounts and blockchainSpecific for new blockchain
    const bitcoinAddAccountsMock = vi.fn().mockResolvedValue({
      wallet: {
        ...baseWallet,
        accounts: [...baseWallet.accounts, newBitcoinAccount],
        blockchainSpecific: {
          ...(baseWallet.blockchainSpecific as Record<string, unknown>),
          Bitcoin: bitcoinBlockchainSpecificData,
        },
      },
    });

    // Create integrations with both Cardano and Bitcoin
    const integrationsWithBitcoin: InMemoryWalletIntegration[] = [
      {
        blockchainName: 'Cardano',
        Icon: () => null,
        initializeWallet: vi.fn(),
        createAccounts: vi.fn(),
        addAccounts: addAccountMock,
      } as unknown as InMemoryWalletIntegration,
      {
        blockchainName: 'Bitcoin',
        Icon: () => null,
        initializeWallet: vi.fn(),
        createAccounts: vi.fn(),
        addAccounts: bitcoinAddAccountsMock,
      } as unknown as InMemoryWalletIntegration,
    ];

    const emissions: unknown[] = [];

    const sideEffect = createInMemoryWalletAddAccountSideEffect(
      integrationsWithBitcoin,
    );

    const sideEffect$ = sideEffect(
      {
        accountManagement: {
          attemptAddInMemoryWalletAccount$: of(
            actions.accountManagement.attemptAddInMemoryWalletAccount({
              walletId,
              blockchain: 'Bitcoin',
              accountIndex: 0,
              authenticationPromptConfig,
              accountName: '',
              targetNetworks: new Set([BlockchainNetworkId('bitcoin-mainnet')]),
            }),
          ),
        },
      } as never,
      {
        wallets: { selectAll$: of([baseWallet]) },
        network: {
          selectActiveNetworkId$: of(() =>
            BlockchainNetworkId('cardano-764824073'),
          ),
        },
      } as never,
      {
        actions,
        authenticate,
        accessAuthSecret,
        logger: dummyLogger,
      } as never,
    );

    await new Promise<void>(resolve => {
      sideEffect$.subscribe({
        next: action => {
          emissions.push(action);
        },
        complete: () => {
          resolve();
        },
      });
    });

    // Verify addAccounts was called with correct params
    expect(bitcoinAddAccountsMock).toHaveBeenCalledWith(
      {
        wallet: baseWallet,
        accountIndex: 0,
        password: expect.any(Uint8Array),
        accountName: '',
        targetNetworks: new Set([BlockchainNetworkId('bitcoin-mainnet')]),
      },
      { logger: dummyLogger },
    );

    // Verify Cardano addAccounts was NOT called (adding Bitcoin, not Cardano)
    expect(addAccountMock).not.toHaveBeenCalled();

    // Verify emissions
    expect(emissions).toHaveLength(2);

    // First emission should update wallet with new account AND blockchainSpecific
    expect(emissions[0]).toEqual(
      actions.wallets.updateWallet({
        id: walletId,
        changes: {
          accounts: [...baseWallet.accounts, newBitcoinAccount] as never,
          blockchainSpecific: {
            Cardano: (baseWallet.blockchainSpecific as Record<string, unknown>)
              .Cardano,
            Bitcoin: bitcoinBlockchainSpecificData,
          },
        },
      }),
    );

    // Second emission should be accountAdded with accountIndex 0 (first account for this blockchain)
    expect(emissions[1]).toMatchObject({
      type: 'accountManagement/accountAdded',
      payload: {
        walletId,
        blockchain: 'Bitcoin',
        accountIndex: 0,
      },
    });
  });

  it('does nothing when wallet type is not InMemory even if blockchain matches', () => {
    const logger = { ...dummyLogger, warn: vi.fn() };

    const nonInMemoryWallet: AnyWallet = {
      ...baseWallet,
      type: WalletType.HardwareLedger,
    } as unknown as AnyWallet;

    testSideEffect(
      createInMemoryWalletAddAccountSideEffect(
        createMockIntegrations(addAccountMock),
      ),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [nonInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddInMemoryWalletAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                  walletId,
                  blockchain: 'Cardano',
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: wallets$ },
            network: {
              selectActiveNetworkId$: of(() =>
                BlockchainNetworkId('cardano-764824073'),
              ),
            },
          },
          dependencies: {
            actions,
            authenticate,
            accessAuthSecret,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-'); // EMPTY
            flush();

            expect(authenticate).not.toHaveBeenCalled();
            expect(addAccountMock).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalledWith(
              'Wallet not found for adding account',
              expect.objectContaining({ walletId }),
            );
          },
        };
      },
    );
  });

  it('clears loading when the password prompt is cancelled (no accessAuthSecret, no addAccount)', () => {
    authenticate.mockReturnValue(of(false));

    testSideEffect(
      createInMemoryWalletAddAccountSideEffect(
        createMockIntegrations(addAccountMock),
      ),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddInMemoryWalletAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: wallets$ },
            network: {
              selectActiveNetworkId$: of(() =>
                BlockchainNetworkId('cardano-764824073'),
              ),
            },
          },
          dependencies: {
            actions,
            authenticate,
            accessAuthSecret,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.setLoading(false),
            });
            flush();

            expect(authenticate).toHaveBeenCalledWith(
              authenticationPromptConfig,
            );
            expect(accessAuthSecret).not.toHaveBeenCalled();
            expect(addAccountMock).not.toHaveBeenCalled();
          },
        };
      },
    );
  });

  it('emits attemptAddAccountFailed and logs when addAccounts errors', async () => {
    addAccountMock.mockRejectedValue(new Error('Add failed'));

    const logger = { ...dummyLogger, error: vi.fn() };
    const emissions: unknown[] = [];

    const sideEffect = createInMemoryWalletAddAccountSideEffect(
      createMockIntegrations(addAccountMock),
    );

    const sideEffect$ = sideEffect(
      {
        accountManagement: {
          attemptAddInMemoryWalletAccount$: of(
            actions.accountManagement.attemptAddInMemoryWalletAccount({
              walletId,
              blockchain,
              accountIndex,
              authenticationPromptConfig,
              accountName: '',
              targetNetworks,
            }),
          ),
        },
      } as never,
      {
        wallets: { selectAll$: of([baseWallet]) },
        network: {
          selectActiveNetworkId$: of(() =>
            BlockchainNetworkId('cardano-764824073'),
          ),
        },
      } as never,
      {
        actions,
        authenticate,
        accessAuthSecret,
        logger,
      } as never,
    );

    await new Promise<void>(resolve => {
      sideEffect$.subscribe({
        next: action => {
          emissions.push(action);
        },
        complete: () => {
          resolve();
        },
      });
    });

    expect(emissions).toHaveLength(1);
    expect(emissions[0]).toEqual(
      actions.accountManagement.attemptAddAccountFailed({ walletId }),
    );

    expect(authenticate).toHaveBeenCalledWith(authenticationPromptConfig);
    expect(addAccountMock).toHaveBeenCalled();
  });

  it('suppresses attemptAddAccountFailed when requested', () => {
    addAccountMock.mockRejectedValue(new Error('Add failed'));

    testSideEffect(
      createInMemoryWalletAddAccountSideEffect(
        createMockIntegrations(addAccountMock),
      ),
      ({ cold, hot, expectObservable }) => {
        const wallets$ = hot('a', { a: [baseWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddInMemoryWalletAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                  shouldSuppressAccountStatus: true,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: wallets$ },
            network: {
              selectActiveNetworkId$: of(() =>
                BlockchainNetworkId('cardano-764824073'),
              ),
            },
          },
          dependencies: {
            actions,
            authenticate,
            accessAuthSecret,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');
          },
        };
      },
    );
  });
});

describe('createAddAccountSideEffect', () => {
  const walletId = WalletId('w1');
  const blockchain = 'Cardano';
  const accountIndex = 2;
  const cardanoNetworkId = BlockchainNetworkId('cardano-764824073');
  const targetNetworks = new Set([cardanoNetworkId]);
  const authenticationPromptConfig = {
    cancellable: true,
    confirmButtonLabel:
      'password-prompt.confirm-button-label.add-account' as TranslationKey,
    message: 'password-prompt.message.add-account' as TranslationKey,
  };

  const baseInMemoryWallet: InMemoryWallet<BlockchainSpecific> = {
    walletId,
    metadata: { name: 'Wallet 1', order: 0 },
    accounts: [
      {
        accountId: AccountId('0'),
        walletId,
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
        metadata: { name: 'Acc #0' },
        blockchainSpecific: { some: 'context' },
        accountType: 'InMemory',
      },
    ],
    blockchainSpecific: {
      Cardano: { encryptedRootPrivateKey: HexBytes('abc123') },
    },
    type: WalletType.InMemory,
    encryptedRecoveryPhrase: HexBytes('00'),
    isPassphraseConfirmed: true,
  };

  const hwWalletId = WalletId('usb-hw-11415-4117-0001000000000001');

  const baseHardwareWallet: AnyWallet = {
    walletId: hwWalletId,
    metadata: { name: 'Hardware Wallet 1', order: 0 },
    accounts: [
      {
        accountId: AccountId('0'),
        walletId: hwWalletId,
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
        metadata: { name: 'Acc #0' },
        blockchainSpecific: { some: 'context' },
        accountType: 'HardwareLedger',
      },
    ],
    blockchainSpecific: { Cardano: { some: 'context' } },
    type: WalletType.HardwareLedger,
  } as AnyWallet;

  const baseMultiSigWallet: AnyWallet = {
    walletId,
    metadata: { name: 'MultiSig Wallet 1', order: 0 },
    accounts: [
      {
        accountId: AccountId('0'),
        walletId,
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
        metadata: { name: 'Acc #0' },
        blockchainSpecific: { some: 'context' },
        accountType: 'MultiSig',
        ownSigners: [],
      },
    ],
    blockchainSpecific: { Cardano: { some: 'context' } },
    type: WalletType.MultiSig,
  } as AnyWallet;

  it('dispatches attemptAddInMemoryWalletAccount for InMemory wallet', () => {
    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId,
                blockchain,
                accountIndex,
                authenticationPromptConfig,
                accountName: '',
                targetNetworks,
              }),
            });

            flush();
          },
        };
      },
    );
  });

  it('forwards suppression flag when dispatching in-memory add account', () => {
    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable }) => {
        const wallets$ = hot('a', { a: [baseInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                  shouldSuppressAccountStatus: true,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId,
                blockchain,
                accountIndex,
                authenticationPromptConfig,
                accountName: '',
                targetNetworks,
                shouldSuppressAccountStatus: true,
              }),
            });
          },
        };
      },
    );
  });

  it('calls connectAccount and dispatches updateWallet + accountAdded for HW wallet', () => {
    const connectAccountMock = vi.fn();
    const hwConnectors = [
      {
        id: HardwareIntegrationId('ledger'),
        walletType: WalletType.HardwareLedger,
        connectAccount: connectAccountMock,
        createWallet: vi.fn(),
      },
    ];

    const hwNewAccount = {
      accountId: AccountId('hw-acc-1'),
      walletId: hwWalletId,
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
      metadata: { name: 'Account #1' },
      blockchainSpecific: { accountIndex },
      accountType: 'HardwareLedger' as const,
    };

    testSideEffect(
      createAddAccountSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        connectAccountMock.mockImplementation(() =>
          cold('(a|)', { a: [hwNewAccount] }),
        );
        const wallets$ = hot('a', { a: [baseHardwareWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: hwWalletId,
                  blockchain,
                  accountIndex,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.wallets.updateWallet({
                id: hwWalletId,
                changes: {
                  accounts: [...baseHardwareWallet.accounts, hwNewAccount],
                } as Partial<HardwareWallet>,
              }),
              b: actions.accountManagement.accountAdded({
                walletId: hwWalletId,
                blockchain,
                accountIndex,
              }),
            });
          },
        };
      },
    );
  });

  it('dispatches attemptAddAccountFailed when no HW connector matches wallet type', () => {
    // Only Trezor connector, but wallet is Ledger
    const hwConnectors = [
      {
        id: HardwareIntegrationId('trezor'),
        walletType: WalletType.HardwareTrezor,
        connectAccount: vi.fn(),
        createWallet: vi.fn(),
      },
    ];

    testSideEffect(
      createAddAccountSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        const wallets$ = hot('a', { a: [baseHardwareWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: hwWalletId,
                  blockchain,
                  accountIndex,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddAccountFailed({
                walletId: hwWalletId,
              }),
            });
          },
        };
      },
    );
  });

  it('dispatches attemptAddAccountFailed with classified error when HW connectAccount errors', () => {
    const connectAccountMock = vi.fn();
    const hwConnectors = [
      {
        id: HardwareIntegrationId('ledger'),
        walletType: WalletType.HardwareLedger,
        connectAccount: connectAccountMock,
        createWallet: vi.fn(),
      },
    ];

    testSideEffect(
      createAddAccountSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        connectAccountMock.mockImplementation(() =>
          cold('#', undefined, new Error('Device error')),
        );
        const wallets$ = hot('a', { a: [baseHardwareWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: hwWalletId,
                  blockchain,
                  accountIndex,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddAccountFailed({
                walletId: hwWalletId,
                errorTitle: 'hw-error.generic.title',
                errorDescription: 'hw-error.generic.subtitle',
              }),
            });
          },
        };
      },
    );
  });

  it('classifies device-disconnected HW error into specific i18n keys', () => {
    const connectAccountMock = vi.fn();
    const hwConnectors = [
      {
        id: HardwareIntegrationId('ledger'),
        walletType: WalletType.HardwareLedger,
        connectAccount: connectAccountMock,
        createWallet: vi.fn(),
      },
    ];

    testSideEffect(
      createAddAccountSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        connectAccountMock.mockImplementation(() =>
          cold(
            '#',
            undefined,
            new Error('Pre-authorized USB device not found'),
          ),
        );
        const wallets$ = hot('a', { a: [baseHardwareWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: hwWalletId,
                  blockchain,
                  accountIndex,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddAccountFailed({
                walletId: hwWalletId,
                errorTitle: 'hw-error.device-disconnected.title',
                errorDescription: 'hw-error.device-disconnected.subtitle',
              }),
            });
          },
        };
      },
    );
  });

  it('infers derivationType from Trezor wallet metadata', () => {
    const trezorWallet: AnyWallet = {
      walletId: hwWalletId,
      metadata: {
        name: 'Trezor Wallet',
        order: 0,
        derivationType: 'ICARUS_TREZOR',
      },
      accounts: [
        {
          accountId: AccountId('hw-acc-0'),
          walletId: hwWalletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
          metadata: { name: 'Account #0' },
          blockchainSpecific: { accountIndex: 0 },
          accountType: 'HardwareTrezor',
        },
      ],
      blockchainSpecific: {},
      type: WalletType.HardwareTrezor,
    } as AnyWallet;

    const hwNewAccount = {
      accountId: AccountId('hw-acc-1'),
      walletId: hwWalletId,
      blockchainName: 'Cardano',
      networkType: 'mainnet',
      blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
      metadata: { name: 'Account #1' },
      blockchainSpecific: { accountIndex },
      accountType: 'HardwareTrezor' as const,
    };

    const connectAccountMock = vi.fn();
    const hwConnectors = [
      {
        id: HardwareIntegrationId('trezor'),
        walletType: WalletType.HardwareTrezor,
        connectAccount: connectAccountMock,
        createWallet: vi.fn(),
      },
    ];

    testSideEffect(
      createAddAccountSideEffect(hwConnectors),
      ({ cold, hot, expectObservable, flush }) => {
        connectAccountMock.mockImplementation(() =>
          cold('(a|)', { a: [hwNewAccount] }),
        );
        const wallets$ = hot('a', { a: [trezorWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: hwWalletId,
                  blockchain,
                  accountIndex,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn().mockReturnValue({}),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.wallets.updateWallet({
                id: hwWalletId,
                changes: {
                  accounts: [...trezorWallet.accounts, hwNewAccount],
                } as Partial<HardwareWallet>,
              }),
              b: actions.accountManagement.accountAdded({
                walletId: hwWalletId,
                blockchain,
                accountIndex,
              }),
            });
            flush();
            expect(connectAccountMock).toHaveBeenCalledWith(
              {},
              expect.objectContaining({
                derivationType: 'ICARUS_TREZOR',
              }),
            );
          },
        };
      },
    );
  });

  it('logs warning and dispatches attemptAddAccountFailed for MultiSig wallet', () => {
    const logger = { ...dummyLogger, warn: vi.fn() };

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseMultiSigWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddAccountFailed({
                walletId,
              }),
            });

            flush();

            expect(logger.warn).toHaveBeenCalledWith(
              'Multi-sig wallet account addition not yet implemented',
              { walletId },
            );
          },
        };
      },
    );
  });

  it('logs warning and dispatches attemptAddAccountFailed when wallet is not found', () => {
    const logger = { ...dummyLogger, warn: vi.fn() };
    const otherWalletId = WalletId('different-wallet');

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: otherWalletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddAccountFailed({
                walletId: otherWalletId,
              }),
            });

            flush();

            expect(logger.warn).toHaveBeenCalledWith(
              'Wallet not found for adding account',
              { walletId: otherWalletId },
            );
          },
        };
      },
    );
  });

  it('logs error and dispatches attemptAddAccountFailed for unknown wallet type', () => {
    const logger = { ...dummyLogger, error: vi.fn() };

    // Mock an unknown wallet type by using an undefined type value
    const unknownWallet = {
      ...baseInMemoryWallet,
      type: undefined as unknown as WalletType,
    };

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [unknownWallet as AnyWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddAccountFailed({
                walletId,
              }),
            });

            flush();

            expect(logger.error).toHaveBeenCalledWith(
              'Unknown wallet type for adding account',
              { walletId },
            );
          },
        };
      },
    );
  });

  it('dispatches attemptAddInMemoryWalletAccount with correct accountName when provided', () => {
    const accountName = 'My Custom Account';

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName,
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId,
                blockchain,
                accountIndex,
                authenticationPromptConfig,
                accountName,
                targetNetworks,
              }),
            });

            flush();
          },
        };
      },
    );
  });

  it('selects the correct wallet when multiple wallets exist', () => {
    const wallet1: InMemoryWallet<BlockchainSpecific> = {
      ...baseInMemoryWallet,
      walletId: WalletId('wallet1'),
      metadata: { name: 'Wallet 1', order: 0 },
    };

    const wallet2: InMemoryWallet<BlockchainSpecific> = {
      ...baseInMemoryWallet,
      walletId: WalletId('wallet2'),
      metadata: { name: 'Wallet 2', order: 1 },
    };

    const wallet3: InMemoryWallet<BlockchainSpecific> = {
      ...baseInMemoryWallet,
      walletId: WalletId('wallet3'),
      metadata: { name: 'Wallet 3', order: 2 },
    };

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [wallet1, wallet2, wallet3] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId: wallet2.walletId,
                  blockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId: wallet2.walletId,
                blockchain,
                accountIndex,
                authenticationPromptConfig,
                accountName: '',
                targetNetworks,
              }),
            });

            flush();
          },
        };
      },
    );
  });

  it('correctly passes through different blockchain names', () => {
    const bitcoinBlockchain = 'Bitcoin';

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain: bitcoinBlockchain,
                  accountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId,
                blockchain: bitcoinBlockchain,
                accountIndex,
                authenticationPromptConfig,
                accountName: '',
                targetNetworks,
              }),
            });

            flush();
          },
        };
      },
    );
  });

  it('correctly passes through different accountIndex values', () => {
    const differentAccountIndex = 5;

    testSideEffect(
      createAddAccountSideEffect([]),
      ({ cold, hot, expectObservable, flush }) => {
        const wallets$ = hot('a', { a: [baseInMemoryWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptAddAccount$: cold('-a', {
                a: actions.accountManagement.attemptAddAccount({
                  walletId,
                  blockchain,
                  accountIndex: differentAccountIndex,
                  authenticationPromptConfig,
                  accountName: '',
                  targetNetworks,
                }),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.attemptAddInMemoryWalletAccount({
                walletId,
                blockchain,
                accountIndex: differentAccountIndex,
                authenticationPromptConfig,
                accountName: '',
                targetNetworks,
              }),
            });

            flush();
          },
        };
      },
    );
  });
});

describe('createRemoveAccountSideEffect', () => {
  const walletId = WalletId('w1');
  const accountId = AccountId('acc1');
  const authenticationPromptConfig = {
    cancellable: true,
    confirmButtonLabel:
      'authentication-prompt.confirm-button-label.remove-account' as TranslationKey,
    message: 'authentication-prompt.message.remove-account' as TranslationKey,
  };

  let authenticate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    authenticate = vi.fn(() => of(true));
  });

  it('prompts for password and removes the account when confirmed', () => {
    const wallet = {
      walletId,
      accounts: [
        {
          accountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'testnet',
          metadata: { name: 'Account' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
        {
          accountId: AccountId('acc2'),
          walletId,
          blockchainName: 'Cardano',
          networkType: 'testnet',
          metadata: { name: 'Account 2' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Wallet', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable, flush }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([wallet]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.wallets.removeAccount(walletId, accountId),
            });

            flush();

            expect(authenticate).toHaveBeenCalledWith(
              authenticationPromptConfig,
            );
          },
        };
      },
    );
  });

  it('does nothing when the authentication prompt is dismissed', () => {
    authenticate.mockReturnValue(of(false));

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable, flush }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(authenticate).toHaveBeenCalledWith(
              authenticationPromptConfig,
            );
          },
        };
      },
    );
  });

  it('logs an error when authentication throws', () => {
    const logger = { ...dummyLogger, error: vi.fn() };
    authenticate.mockReturnValue(throwError(() => new Error('auth failed')));

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable, flush }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-'); // EMPTY

            flush();

            expect(logger.error).toHaveBeenCalledWith(
              'Failed to remove account after auth prompt',
              expect.any(Error),
            );
          },
        };
      },
    );
  });

  it('emits nothing when the wallet is not in the repository after auth succeeds', () => {
    authenticate.mockReturnValue(of(true));

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable, flush }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-');

            flush();

            expect(authenticate).toHaveBeenCalledTimes(1);
          },
        };
      },
    );
  });

  it('removes only the testnet account when the wallet has exactly one mainnet account but the removal targets testnet', () => {
    const wallet = {
      walletId,
      accounts: [
        {
          accountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'testnet',
          metadata: { name: 'Account' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
        {
          accountId: AccountId('acc-mainnet'),
          walletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'Account mainnet' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Wallet', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([wallet]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.wallets.removeAccount(walletId, accountId),
            });
          },
        };
      },
    );
  });

  it('removes only the matching testnet account when another testnet exists on a different network id', () => {
    const preprodId = BlockchainNetworkId('cardano-1');
    const previewId = BlockchainNetworkId('cardano-2');
    const previewAccountId = AccountId('acc-preview');

    const wallet = {
      walletId,
      accounts: [
        {
          accountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: preprodId,
          metadata: { name: 'Account preprod' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
        {
          accountId: previewAccountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'testnet',
          blockchainNetworkId: previewId,
          metadata: { name: 'Account preview' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Wallet', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([wallet]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.wallets.removeAccount(walletId, accountId),
            });
          },
        };
      },
    );
  });

  it('dispatches removeWallet with all account ids when removing an account from a wallet that has exactly one mainnet account', () => {
    const mainnetAccountId = AccountId('acc-mainnet');
    const testnetAccountId = AccountId('acc-test');

    const wallet = {
      walletId,
      accounts: [
        {
          accountId: testnetAccountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'testnet',
          metadata: { name: 'Account testnet' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
        {
          accountId: mainnetAccountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'Account mainnet' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Wallet', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId: mainnetAccountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([wallet]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.wallets.removeWallet(walletId, [
                testnetAccountId,
                mainnetAccountId,
              ]),
            });
          },
        };
      },
    );
  });

  it('removes only one mainnet account when another mainnet account exists in the wallet', () => {
    const otherMainnetId = AccountId('acc-mainnet-2');

    const wallet = {
      walletId,
      accounts: [
        {
          accountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'Account 1' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
        {
          accountId: otherMainnetId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'Account 2' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Wallet', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveAccountSideEffect,
      ({ cold, expectObservable }) => {
        return {
          actionObservables: {
            accountManagement: {
              attemptRemoveAccount$: cold('-a', {
                a: actions.accountManagement.attemptRemoveAccount({
                  walletId,
                  accountId,
                  authenticationPromptConfig,
                }),
              }),
            },
          },
          stateObservables: {
            wallets: { selectAll$: of([wallet]) },
          },
          dependencies: {
            actions,
            authenticate,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.wallets.removeAccount(walletId, accountId),
            });
          },
        };
      },
    );
  });
});

describe('createRemoveWalletSideEffect', () => {
  const walletId = WalletId('w-rw');
  const accountId = AccountId('acc-rw');
  const authenticationPromptConfig = {
    cancellable: true,
    confirmButtonLabel:
      'authentication-prompt.confirm-button-label.remove-account' as TranslationKey,
    message: 'authentication-prompt.message.remove-account' as TranslationKey,
  };

  let authenticate: ReturnType<typeof vi.fn>;

  const makeWallet = () =>
    ({
      walletId,
      accounts: [
        {
          accountId,
          walletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'A' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'W', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    authenticate = vi.fn(() => of(true));
  });

  it('dispatches removeWallet with account ids after authentication succeeds', () => {
    testSideEffect(
      createRemoveWalletSideEffect,
      ({ cold, expectObservable, flush }) => ({
        actionObservables: {
          accountManagement: {
            attemptRemoveWallet$: cold('-a', {
              a: actions.accountManagement.attemptRemoveWallet({
                walletId,
                authenticationPromptConfig,
              }),
            }),
          },
        },
        stateObservables: {
          wallets: { selectAll$: of([makeWallet()]) },
        },
        dependencies: {
          actions,
          authenticate,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.wallets.removeWallet(walletId, [accountId]),
          });
          flush();
          expect(authenticate).toHaveBeenCalledWith(authenticationPromptConfig);
        },
      }),
    );
  });

  it('emits nothing when the wallet to remove is not in state after auth succeeds', () => {
    const otherWalletId = WalletId('w-other');
    const otherWallet = {
      walletId: otherWalletId,
      accounts: [
        {
          accountId: AccountId('other-acc'),
          walletId: otherWalletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'Other' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Other W', order: 0 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveWalletSideEffect,
      ({ cold, expectObservable, flush }) => ({
        actionObservables: {
          accountManagement: {
            attemptRemoveWallet$: cold('-a', {
              a: actions.accountManagement.attemptRemoveWallet({
                walletId,
                authenticationPromptConfig,
              }),
            }),
          },
        },
        stateObservables: {
          wallets: { selectAll$: of([otherWallet]) },
        },
        dependencies: {
          actions,
          authenticate,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();
          expect(authenticate).toHaveBeenCalledTimes(1);
        },
      }),
    );
  });

  it('does nothing when authentication is dismissed', () => {
    authenticate.mockReturnValue(of(false));
    testSideEffect(
      createRemoveWalletSideEffect,
      ({ cold, expectObservable, flush }) => ({
        actionObservables: {
          accountManagement: {
            attemptRemoveWallet$: cold('-a', {
              a: actions.accountManagement.attemptRemoveWallet({
                walletId,
                authenticationPromptConfig,
              }),
            }),
          },
        },
        stateObservables: {
          wallets: { selectAll$: of([makeWallet()]) },
        },
        dependencies: {
          actions,
          authenticate,
          logger: dummyLogger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();
        },
      }),
    );
  });

  it('logs an error when authentication throws', () => {
    const logger = { ...dummyLogger, error: vi.fn() };
    authenticate.mockReturnValue(throwError(() => new Error('auth failed')));
    testSideEffect(
      createRemoveWalletSideEffect,
      ({ cold, expectObservable, flush }) => ({
        actionObservables: {
          accountManagement: {
            attemptRemoveWallet$: cold('-a', {
              a: actions.accountManagement.attemptRemoveWallet({
                walletId,
                authenticationPromptConfig,
              }),
            }),
          },
        },
        stateObservables: {
          wallets: { selectAll$: of([makeWallet()]) },
        },
        dependencies: {
          actions,
          authenticate,
          logger,
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
          flush();
          expect(logger.error).toHaveBeenCalledWith(
            'Failed to remove wallet after auth prompt',
            expect.any(Error),
          );
        },
      }),
    );
  });
});

describe('createRemoveWalletNavigationSideEffect', () => {
  const walletId = WalletId('w-nav');
  const accountId = AccountId('acc-nav');

  const stubSecureStore = () =>
    ({
      deletePassword: vi.fn().mockResolvedValue(undefined),
      isAvailableAsync: vi.fn().mockResolvedValue(true),
    } as unknown as SecureStore);

  it('navigates to Home and RemoveWalletSuccess when wallets remain after removeWallet', () => {
    const otherWalletId = WalletId('w-other');
    const otherWallet = {
      walletId: otherWalletId,
      accounts: [
        {
          accountId: AccountId('other-acc'),
          walletId: otherWalletId,
          blockchainName: 'Cardano',
          networkType: 'mainnet',
          metadata: { name: 'O' },
          blockchainSpecific: {},
          accountType: 'InMemory',
        },
      ],
      metadata: { name: 'Other', order: 1 },
      type: WalletType.InMemory,
      blockchainSpecific: {},
    } as never;

    testSideEffect(
      createRemoveWalletNavigationSideEffect,
      ({ cold, expectObservable, flush }) => ({
        actionObservables: {
          wallets: {
            removeWallet$: cold('-a', {
              a: actions.wallets.removeWallet(walletId, [accountId]),
            }),
          },
        },
        stateObservables: {
          wallets: {
            selectAll$: of([otherWallet]),
          },
        },
        dependencies: {
          actions,
          logger: dummyLogger,
          secureStore: stubSecureStore(),
        },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-(ab)', {
            a: actions.views.setActivePage({
              route: StackRoutes.Home,
              params: { screen: TabRoutes.AccountCenter },
            }),
            b: actions.views.setActiveSheetPage({
              route: SheetRoutes.RemoveWalletSuccess,
            }),
          });
          flush();
        },
      }),
    );
  });

  it('navigates to onboarding when no wallets remain and secure store is unavailable', async () => {
    const secureStore = stubSecureStore();
    const navigationAction = await firstValueFrom(
      createRemoveWalletNavigationSideEffect(
        {
          wallets: {
            removeWallet$: of(
              actions.wallets.removeWallet(walletId, [accountId]),
            ),
          },
        } as never,
        {
          wallets: {
            selectAll$: of([]),
          },
        } as never,
        {
          actions,
          logger: dummyLogger,
          secureStore,
        } as never,
      ),
    );
    expect(navigationAction).toEqual(
      actions.views.setActivePage({
        route: StackRoutes.OnboardingStart,
      }),
    );
  });

  it('logs a warning and still navigates to onboarding when secure store throws', async () => {
    const logger = { ...dummyLogger, warn: vi.fn() };
    const secureStore = {
      isAvailableAsync: vi.fn().mockRejectedValue(new Error('store error')),
    };
    const navigationAction = await firstValueFrom(
      createRemoveWalletNavigationSideEffect(
        {
          wallets: {
            removeWallet$: of(
              actions.wallets.removeWallet(walletId, [accountId]),
            ),
          },
        } as never,
        {
          wallets: {
            selectAll$: of([]),
          },
        } as never,
        {
          actions,
          logger,
          secureStore,
        } as never,
      ),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to clear password from secure storage',
      expect.any(Error),
    );
    expect(navigationAction).toEqual(
      actions.views.setActivePage({
        route: StackRoutes.OnboardingStart,
      }),
    );
  });
});

describe('createRemoveAccountNavigationSideEffect', () => {
  const walletId = WalletId('w1');
  const accountId = AccountId('acc1');

  it('navigates to RemoveAccountSuccess sheet and resets navigation to Home', () => {
    testSideEffect(
      createRemoveAccountNavigationSideEffect,
      ({ cold, expectObservable, flush }) => {
        return {
          actionObservables: {
            wallets: {
              removeAccount$: cold('-a', {
                a: actions.wallets.removeAccount(walletId, accountId),
              }),
            },
          },
          dependencies: {
            actions,
            logger: dummyLogger,
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.views.setActivePage({
                route: StackRoutes.Home,
                params: { screen: TabRoutes.AccountCenter },
              }),
              b: actions.views.setActiveSheetPage({
                route: SheetRoutes.RemoveAccountSuccess,
              }),
            });

            flush();
          },
        };
      },
    );
  });
});

describe('createAccountAddedSuccessSheetSideEffect', () => {
  it('opens success sheet when not suppressed', () => {
    testSideEffect(
      createAccountAddedSuccessSheetSideEffect,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          accountManagement: {
            accountAdded$: cold('-a', {
              a: actions.accountManagement.accountAdded({
                walletId: WalletId('w1'),
                blockchain: 'Cardano',
                accountIndex: 0,
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-a', {
            a: actions.views.setActiveSheetPage({
              route: SheetRoutes.AddedAccountSuccess,
            }),
          });
        },
      }),
    );
  });

  it('does not open success sheet when suppressed', () => {
    testSideEffect(
      createAccountAddedSuccessSheetSideEffect,
      ({ cold, expectObservable }) => ({
        actionObservables: {
          accountManagement: {
            accountAdded$: cold('-a', {
              a: actions.accountManagement.accountAdded({
                walletId: WalletId('w1'),
                blockchain: 'Cardano',
                accountIndex: 0,
                shouldSuppressAccountStatus: true,
              }),
            }),
          },
        },
        dependencies: { actions },
        assertion: sideEffect$ => {
          expectObservable(sideEffect$).toBe('-');
        },
      }),
    );
  });
});

describe('createWalletCreationSideEffect', () => {
  const walletName = 'New Wallet';
  const blockchains = ['Cardano'] as ['Cardano'];

  let authenticate: ReturnType<typeof vi.fn>;
  let accessAuthSecret: ReturnType<typeof vi.fn>;
  let initializeWalletMock: ReturnType<typeof vi.fn>;

  const existingWallet: InMemoryWallet<BlockchainSpecific> = {
    walletId: WalletId('existing'),
    metadata: { name: 'Existing Wallet', order: 0 },
    accounts: [
      {
        accountId: AccountId('existing-0'),
        walletId: WalletId('existing'),
        blockchainName: 'Cardano',
        networkType: 'mainnet',
        blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
        metadata: { name: 'Acc #0' },
        blockchainSpecific: { some: 'context' },
        accountType: 'InMemory',
      },
    ],
    blockchainSpecific: {
      Cardano: { encryptedRootPrivateKey: HexBytes('abc123') },
    },
    type: WalletType.InMemory,
    encryptedRecoveryPhrase: HexBytes('00'),
    isPassphraseConfirmed: true,
  };

  const mockAccount = {
    accountId: AccountId('new-0'),
    walletId: WalletId('new'),
    blockchainName: 'Cardano',
    networkType: 'mainnet',
    blockchainNetworkId: BlockchainNetworkId('cardano-764824073'),
    metadata: { name: 'Acc #0' },
    blockchainSpecific: { some: 'data' },
    accountType: 'InMemory',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    authenticate = vi.fn(() => of(true));
    accessAuthSecret = vi.fn((callback: (secret: Uint8Array) => unknown) =>
      callback(new Uint8Array([1, 2, 3, 4])),
    );

    initializeWalletMock = vi.fn().mockResolvedValue({
      accounts: [mockAccount],
      blockchainSpecificWalletData: {
        encryptedRootPrivateKey: HexBytes('cafe'),
      },
    });
  });

  const createIntegrations = (): InMemoryWalletIntegration[] => [
    {
      blockchainName: 'Cardano',
      Icon: () => null,
      initializeWallet: initializeWalletMock,
      createAccounts: vi.fn(),
      addAccounts: vi.fn(),
    } as unknown as InMemoryWalletIntegration,
  ];

  it('dispatches setLoading, addWallet, setLoading(false), and navigation on success', async () => {
    const emissions: unknown[] = [];
    const sideEffect = createWalletCreationSideEffect(createIntegrations());

    const sideEffect$ = sideEffect(
      {
        accountManagement: {
          attemptCreateWallet$: of(
            actions.accountManagement.attemptCreateWallet({
              walletName,
              blockchains,
            }),
          ),
        },
      } as never,
      {
        wallets: { selectAll$: of([existingWallet]) },
        network: {
          selectActiveNetworkId$: of(() =>
            BlockchainNetworkId('cardano-764824073'),
          ),
        },
      } as never,
      {
        actions,
        authenticate,
        accessAuthSecret,
        logger: dummyLogger,
      } as never,
    );

    await new Promise<void>(resolve => {
      sideEffect$.subscribe({
        next: action => emissions.push(action),
        complete: resolve,
      });
    });

    expect(emissions[0]).toEqual(actions.accountManagement.setLoading(true));
    expect(emissions[1]).toMatchObject({ type: 'wallets/addWallet' });
    expect(emissions[2]).toEqual(actions.accountManagement.setLoading(false));
    expect(emissions[3]).toMatchObject({
      type: 'views/setActiveSheetPage',
      payload: { route: SheetRoutes.SuccessCreateNewWallet },
    });
  });
});

describe('createHardwareWalletCreationSideEffect', () => {
  const ledgerOptionId = HardwareIntegrationId('ledger');
  const trezorOptionId = HardwareIntegrationId('trezor');
  const device = {
    vendorId: 0x2c_97,
    productId: 0x10_01,
    serialNumber: 'abc123',
  };
  const payload = {
    optionId: ledgerOptionId,
    device,
    accountIndex: 0,
    blockchainName: 'Cardano' as const,
  };

  const walletEntity: HardwareWallet = {
    walletId: WalletId('hw-1'),
    type: WalletType.HardwareLedger,
    metadata: { name: 'Hardware Wallet', order: 0 },
    accounts: [],
    blockchainSpecific: {},
  } as unknown as HardwareWallet;

  const existingWallet = {
    walletId: WalletId('existing'),
    type: WalletType.InMemory,
    metadata: { name: 'Existing', order: 0 },
    accounts: [],
    blockchainSpecific: {},
    encryptedRecoveryPhrase: HexBytes('00'),
    isPassphraseConfirmed: true,
  } as unknown as AnyWallet;

  it('dispatches setLoading + addWallet (with next order) + setLoading(false) + navigation on success', () => {
    const createWalletMock = vi.fn();
    const hwConnectors = [
      {
        id: ledgerOptionId,
        walletType: WalletType.HardwareLedger,
        connectAccount: vi.fn(),
        createWallet: createWalletMock,
      },
    ];

    testSideEffect(
      createHardwareWalletCreationSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        createWalletMock.mockImplementation(() =>
          cold('(a|)', { a: walletEntity }),
        );
        const wallets$ = hot('a', { a: [existingWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptCreateHardwareWallet$: cold('-a', {
                a: actions.accountManagement.attemptCreateHardwareWallet(
                  payload,
                ),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(abcd)', {
              a: actions.accountManagement.setLoading(true),
              b: actions.wallets.addWallet({
                ...walletEntity,
                metadata: { ...walletEntity.metadata, order: 1 },
              }),
              c: actions.accountManagement.setLoading(false),
              d: actions.views.setActiveSheetPage({
                route: SheetRoutes.SuccessCreateNewWallet,
                params: { walletId: walletEntity.walletId },
              }),
            });
          },
        };
      },
    );
  });

  it('dispatches hardwareWalletCreationFailed with "generic" when no connector matches', () => {
    const hwConnectors = [
      {
        id: trezorOptionId,
        walletType: WalletType.HardwareTrezor,
        connectAccount: vi.fn(),
        createWallet: vi.fn(),
      },
    ];

    testSideEffect(
      createHardwareWalletCreationSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        const wallets$ = hot('a', { a: [] });

        return {
          actionObservables: {
            accountManagement: {
              attemptCreateHardwareWallet$: cold('-a', {
                a: actions.accountManagement.attemptCreateHardwareWallet(
                  payload,
                ),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a', {
              a: actions.accountManagement.hardwareWalletCreationFailed({
                reason: 'generic',
              }),
            });
          },
        };
      },
    );
  });

  it('dispatches hardwareWalletCreationFailed with classified reason when connector throws', () => {
    const createWalletMock = vi.fn();
    const hwConnectors = [
      {
        id: ledgerOptionId,
        walletType: WalletType.HardwareLedger,
        connectAccount: vi.fn(),
        createWallet: createWalletMock,
      },
    ];

    testSideEffect(
      createHardwareWalletCreationSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        createWalletMock.mockImplementation(() =>
          throwError(() => new Error('Failed to connect to device')),
        );
        const wallets$ = hot('a', { a: [existingWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptCreateHardwareWallet$: cold('-a', {
                a: actions.accountManagement.attemptCreateHardwareWallet(
                  payload,
                ),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.accountManagement.setLoading(true),
              b: actions.accountManagement.hardwareWalletCreationFailed({
                reason: 'generic',
              }),
            });
          },
        };
      },
    );
  });

  it('dispatches hardwareWalletCreationFailed with "unauthorized" when user cancels on device', () => {
    const createWalletMock = vi.fn();
    const hwConnectors = [
      {
        id: ledgerOptionId,
        walletType: WalletType.HardwareLedger,
        connectAccount: vi.fn(),
        createWallet: createWalletMock,
      },
    ];

    testSideEffect(
      createHardwareWalletCreationSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        createWalletMock.mockImplementation(() =>
          throwError(() => new Error('User cancelled the operation')),
        );
        const wallets$ = hot('a', { a: [existingWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptCreateHardwareWallet$: cold('-a', {
                a: actions.accountManagement.attemptCreateHardwareWallet(
                  payload,
                ),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-(ab)', {
              a: actions.accountManagement.setLoading(true),
              b: actions.accountManagement.hardwareWalletCreationFailed({
                reason: 'unauthorized',
              }),
            });
          },
        };
      },
    );
  });

  it('cancels in-flight createWallet when a new attempt is dispatched (switchMap)', () => {
    const createWalletMock = vi.fn();
    const hwConnectors = [
      {
        id: ledgerOptionId,
        walletType: WalletType.HardwareLedger,
        connectAccount: vi.fn(),
        createWallet: createWalletMock,
      },
    ];

    testSideEffect(
      createHardwareWalletCreationSideEffect(hwConnectors),
      ({ cold, hot, expectObservable }) => {
        // First attempt: connector never emits (stays in-flight).
        // Second attempt: connector emits immediately → reaches success path.
        createWalletMock
          .mockImplementationOnce(() => cold<HardwareWallet>('----'))
          .mockImplementationOnce(() =>
            cold<HardwareWallet>('(a|)', { a: walletEntity }),
          );
        const wallets$ = hot('a', { a: [existingWallet] });

        return {
          actionObservables: {
            accountManagement: {
              attemptCreateHardwareWallet$: cold('-a--b', {
                a: actions.accountManagement.attemptCreateHardwareWallet(
                  payload,
                ),
                b: actions.accountManagement.attemptCreateHardwareWallet(
                  payload,
                ),
              }),
            },
          },
          stateObservables: { wallets: { selectAll$: wallets$ } },
          dependencies: {
            actions,
            logger: dummyLogger,
            __getState: vi.fn(),
          },
          assertion: sideEffect$ => {
            expectObservable(sideEffect$).toBe('-a--(bcde)', {
              a: actions.accountManagement.setLoading(true),
              b: actions.accountManagement.setLoading(true),
              c: actions.wallets.addWallet({
                ...walletEntity,
                metadata: { ...walletEntity.metadata, order: 1 },
              }),
              d: actions.accountManagement.setLoading(false),
              e: actions.views.setActiveSheetPage({
                route: SheetRoutes.SuccessCreateNewWallet,
                params: { walletId: walletEntity.walletId },
              }),
            });
          },
        };
      },
    );

    expect(createWalletMock).toHaveBeenCalledTimes(2);
  });
});
