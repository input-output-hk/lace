import { DappId } from '@lace-contract/dapp-connector';
import { of } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleRequestValidation,
  initializeCardanoDappConnectorDependencies,
} from '../src/browser/store/dependencies/dapp-connector';
import { APIErrorCode } from '../src/common/api-error';

import type { AuthorizedDappsDataSlice } from '@lace-contract/dapp-connector';
import type { Runtime } from 'webextension-polyfill';

// Type for request options
interface MethodRequestOptions {
  validate?: (
    request: unknown,
    sender: Runtime.MessageSender | undefined,
  ) => Promise<void>;
  transform?: (
    request: { method: string; args: unknown[] },
    sender: Runtime.MessageSender | undefined,
  ) => { method: string; args: unknown[] };
}

interface MethodProperty {
  propType: unknown;
  requestOptions: MethodRequestOptions;
}

interface ExposeApiConfig {
  baseChannel: string;
  api$: unknown;
  properties: Record<string, MethodProperty>;
}

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  runtime: {
    id: 'test-extension-id',
  },
}));

// Mock @lace-sdk/dapp-connector
vi.mock('@lace-sdk/dapp-connector', () => ({
  senderOrigin: (sender: Runtime.MessageSender) => sender.url,
}));

// Mock @lace-sdk/extension-messaging
const mockExposeApi = vi.fn();
const mockShutdown = vi.fn();

vi.mock('@lace-sdk/extension-messaging', async () => {
  const actual = await vi.importActual('@lace-sdk/extension-messaging');
  return {
    ...actual,
    exposeApi: (...arguments_: unknown[]) => {
      mockExposeApi(...arguments_);
      return { shutdown: mockShutdown };
    },
  };
});

// Helper to get the first exposeApi call config with proper typing
const getExposeApiConfig = (): ExposeApiConfig => {
  const calls = mockExposeApi.mock.calls as [[ExposeApiConfig, unknown]];
  return calls[0][0];
};

describe('dapp-connector-extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleRequestValidation', () => {
    const createAuthorizedDapps = (
      origins: string[],
    ): AuthorizedDappsDataSlice => ({
      Cardano: origins.map(origin => ({
        dapp: {
          id: DappId(origin),
          name: `DApp ${origin}`,
          origin,
          imageUrl: `${origin}/favicon.ico`,
        },
        blockchain: 'Cardano' as const,
        isPersisted: true,
        authorizedAt: Date.now(),
      })),
    });

    const unlockedState$ = of(true);

    it('should not throw for authorized origin', async () => {
      const authorizedOrigin = 'https://authorized-dapp.com';
      const sender: Runtime.MessageSender = {
        url: authorizedOrigin,
      };
      const authorizedDapps$ = of(createAuthorizedDapps([authorizedOrigin]));

      await expect(
        handleRequestValidation(sender, authorizedDapps$, unlockedState$),
      ).resolves.toBeUndefined();
    });

    it('should throw APIError for unauthorized origin', async () => {
      const unauthorizedOrigin = 'https://unauthorized-dapp.com';
      const sender: Runtime.MessageSender = {
        url: unauthorizedOrigin,
      };
      const authorizedDapps$ = of(
        createAuthorizedDapps(['https://other-dapp.com']),
      );

      await expect(
        handleRequestValidation(sender, authorizedDapps$, unlockedState$),
      ).rejects.toMatchObject({
        code: APIErrorCode.Refused,
        info: expect.stringContaining('Unauthorized request origin') as string,
      });
    });

    it('should throw APIError when sender is undefined', async () => {
      const authorizedDapps$ = of(createAuthorizedDapps([]));

      await expect(
        handleRequestValidation(undefined, authorizedDapps$, unlockedState$),
      ).rejects.toMatchObject({
        code: APIErrorCode.Refused,
      });
    });

    it('should throw APIError when no Cardano dApps are authorized', async () => {
      const sender: Runtime.MessageSender = {
        url: 'https://some-dapp.com',
      };
      const authorizedDapps$ = of({
        Cardano: undefined,
      } as AuthorizedDappsDataSlice);

      await expect(
        handleRequestValidation(sender, authorizedDapps$, unlockedState$),
      ).rejects.toMatchObject({
        code: APIErrorCode.Refused,
      });
    });

    it('should handle multiple authorized origins', async () => {
      const origins = [
        'https://dapp1.com',
        'https://dapp2.com',
        'https://dapp3.com',
      ];
      const sender: Runtime.MessageSender = {
        url: 'https://dapp2.com',
      };
      const authorizedDapps$ = of(createAuthorizedDapps(origins));

      await expect(
        handleRequestValidation(sender, authorizedDapps$, unlockedState$),
      ).resolves.toBeUndefined();
    });

    it('should throw APIError when app is locked', async () => {
      const authorizedOrigin = 'https://authorized-dapp.com';
      const sender: Runtime.MessageSender = {
        url: authorizedOrigin,
      };
      const authorizedDapps$ = of(createAuthorizedDapps([authorizedOrigin]));
      const isUnlocked$ = of(false);

      await expect(
        handleRequestValidation(sender, authorizedDapps$, isUnlocked$),
      ).rejects.toMatchObject({
        code: APIErrorCode.Refused,
        info: expect.stringContaining('Wallet is locked') as string,
      });
    });

    it('should not throw when app is unlocked', async () => {
      const authorizedOrigin = 'https://authorized-dapp.com';
      const sender: Runtime.MessageSender = {
        url: authorizedOrigin,
      };
      const authorizedDapps$ = of(createAuthorizedDapps([authorizedOrigin]));
      const isUnlocked$ = of(true);

      await expect(
        handleRequestValidation(sender, authorizedDapps$, isUnlocked$),
      ).resolves.toBeUndefined();
    });
  });

  describe('initializeCardanoDappConnectorDependencies', () => {
    const mockLogger = dummyLogger;

    it('should return an object with connectCardanoDappConnector function', () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      expect(dependencies).toHaveProperty('connectCardanoDappConnector');
      expect(typeof dependencies.connectCardanoDappConnector).toBe('function');
    });

    it('should expose API when Observable is subscribed', () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$: of({ Cardano: [] }),
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      const subscription = observable.subscribe();

      expect(mockExposeApi).toHaveBeenCalledTimes(1);
      expect(mockExposeApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseChannel: expect.any(String) as string,
          api$: expect.any(Object) as object,
          properties: expect.any(Object) as object,
        }),
        expect.objectContaining({
          logger: mockLogger,
        }),
      );

      subscription.unsubscribe();
    });

    it('should shutdown API when subscription is unsubscribed', () => {
      const logDebugSpy = vi.spyOn(mockLogger, 'debug');
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$: of({ Cardano: [] }),
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      const subscription = observable.subscribe();
      subscription.unsubscribe();

      expect(mockShutdown).toHaveBeenCalledTimes(1);
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Shutting down Cardano dApp connector',
      );
    });

    it('should configure request validation for non-getNetworkId methods', () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const authorizedDapps$ = of({
        Cardano: [
          {
            dapp: {
              id: DappId('https://authorized.com'),
              name: 'Test DApp',
              origin: 'https://authorized.com',
              imageUrl: 'https://authorized.com/icon.png',
            },
            blockchain: 'Cardano' as const,
            isPersisted: true,
            authorizedAt: Date.now(),
          },
        ],
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$,
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      observable.subscribe();

      // Get the properties passed to exposeApi
      const { properties } = getExposeApiConfig();

      // getNetworkId should have validate (for lock-state check) but no transform
      expect(properties['getNetworkId']?.requestOptions).toHaveProperty(
        'validate',
      );
      expect(properties['getNetworkId']?.requestOptions).not.toHaveProperty(
        'transform',
      );

      // All account-dependent methods need both validate and transform for sender context
      // (needed for per-dApp account isolation)
      expect(properties['getBalance']?.requestOptions).toHaveProperty(
        'validate',
      );
      expect(properties['getBalance']?.requestOptions).toHaveProperty(
        'transform',
      );

      // signTx and signData also require sender context
      expect(properties['signTx']?.requestOptions).toHaveProperty('validate');
      expect(properties['signTx']?.requestOptions).toHaveProperty('transform');
      expect(properties['signData']?.requestOptions).toHaveProperty('validate');
      expect(properties['signData']?.requestOptions).toHaveProperty(
        'transform',
      );
    });

    it('should throw APIError in transform when sender is undefined', () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$: of({ Cardano: [] }),
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      observable.subscribe();

      // Get the transform function from signTx (a method that requires sender context)
      const { properties } = getExposeApiConfig();
      const { transform } = properties['signTx']?.requestOptions ?? {};

      expect(transform).toBeDefined();
      // Call transform with undefined sender - should throw APIError
      let thrownError: unknown;
      try {
        transform?.({ method: 'signTx', args: [] }, undefined);
      } catch (error) {
        thrownError = error;
      }
      expect(thrownError).toMatchObject({
        code: APIErrorCode.InternalError,
        info: 'Unknown sender',
      });
    });

    it('should add sender context to args in transform', () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$: of({ Cardano: [] }),
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      observable.subscribe();

      // Get the transform function from signTx (a method that requires sender context)
      const { properties } = getExposeApiConfig();
      const { transform } = properties['signTx']?.requestOptions ?? {};

      expect(transform).toBeDefined();
      const mockSender: Runtime.MessageSender = {
        url: 'https://test-dapp.com',
      };
      const result = transform?.(
        { method: 'signTx', args: ['txCbor', false] },
        mockSender,
      );

      expect(result).toEqual({
        method: 'signTx',
        args: ['txCbor', false, { sender: mockSender }],
      });
    });

    it('should pad args array to place sender context at correct position', () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$: of({ Cardano: [] }),
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      observable.subscribe();

      const { properties } = getExposeApiConfig();
      const mockSender: Runtime.MessageSender = {
        url: 'https://test-dapp.com',
      };

      // getUsedAddresses(paginate?, context) - context should be at index 1
      // When called with no args, should pad to [undefined, { sender }]
      const { transform: transformUsedAddresses } =
        properties['getUsedAddresses']?.requestOptions ?? {};
      expect(transformUsedAddresses).toBeDefined();
      expect(
        transformUsedAddresses?.(
          { method: 'getUsedAddresses', args: [] },
          mockSender,
        ),
      ).toEqual({
        method: 'getUsedAddresses',
        args: [undefined, { sender: mockSender }],
      });

      // getBalance(context) - context should be at index 0
      // When called with no args, should produce [{ sender }]
      const { transform: transformBalance } =
        properties['getBalance']?.requestOptions ?? {};
      expect(transformBalance).toBeDefined();
      expect(
        transformBalance?.({ method: 'getBalance', args: [] }, mockSender),
      ).toEqual({
        method: 'getBalance',
        args: [{ sender: mockSender }],
      });

      // getUtxos(amount?, paginate?, context) - context should be at index 2
      // When called with no args, should pad to [undefined, undefined, { sender }]
      const { transform: transformUtxos } =
        properties['getUtxos']?.requestOptions ?? {};
      expect(transformUtxos).toBeDefined();
      expect(
        transformUtxos?.({ method: 'getUtxos', args: [] }, mockSender),
      ).toEqual({
        method: 'getUtxos',
        args: [undefined, undefined, { sender: mockSender }],
      });
    });

    it('should call validate with sender and authorizedDapps$', async () => {
      const dependencies = initializeCardanoDappConnectorDependencies({
        logger: mockLogger,
      });

      const authorizedDapps$ = of({
        Cardano: [
          {
            dapp: {
              id: DappId('https://authorized.com'),
              name: 'Test DApp',
              origin: 'https://authorized.com',
              imageUrl: 'https://authorized.com/icon.png',
            },
            blockchain: 'Cardano' as const,
            isPersisted: true,
            authorizedAt: Date.now(),
          },
        ],
      });

      const handleRequests = vi.fn().mockReturnValue(of());
      const observable = dependencies.connectCardanoDappConnector({
        authorizedDapps$,
        handleRequests,
        accountUtxos$: of({}),
        accountUnspendableUtxos$: of({}),
        rewardAccountDetails$: of({}),
        addresses$: of([]),
        accountTransactionHistory$: of({}),
        chainId$: of(undefined),
        allAccounts$: of([]),
        allWallets$: of([]),
        getAccountIdForOrigin: () => undefined,
        submitTransaction: vi.fn().mockResolvedValue('mock-tx-hash'),
        isUnlocked$: of(true),
      });

      observable.subscribe();

      // Get the validate function
      const { properties } = getExposeApiConfig();
      const { validate } = properties['getBalance']?.requestOptions ?? {};

      expect(validate).toBeDefined();

      // Test with authorized sender
      const authorizedSender: Runtime.MessageSender = {
        url: 'https://authorized.com',
      };
      await expect(validate?.({}, authorizedSender)).resolves.toBeUndefined();

      // Test with unauthorized sender
      const unauthorizedSender: Runtime.MessageSender = {
        url: 'https://unauthorized.com',
      };
      await expect(validate?.({}, unauthorizedSender)).rejects.toMatchObject({
        code: APIErrorCode.Refused,
      });
    });
  });
});
