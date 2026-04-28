import {
  AuthenticatorError,
  AuthenticatorErrorCode,
} from '@lace-contract/dapp-connector';
import { exposeAuthenticatorApi } from '@lace-sdk/dapp-connector';
import { BehaviorSubject, NEVER, Subject } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import initializeStore from '../src/store/init';

import type { Dapp, DappId } from '@lace-contract/dapp-connector';
import type { ModuleInitProps } from '@lace-contract/module';
import type { AuthenticatorApi } from '@lace-sdk/dapp-connector';
import type { ChannelName } from '@lace-sdk/extension-messaging';

const mockShutdown = vi.fn();
const mockDisconnectSubject = new Subject();
const mockConnectSubject = new Subject();

const createMockDapp = (origin: string): Dapp => ({
  id: origin as DappId,
  imageUrl: `${origin}/favicon.ico`,
  name: 'Test Dapp',
  origin,
});

vi.mock('@lace-sdk/dapp-connector', () => ({
  exposeAuthenticatorApi: vi.fn(() => ({
    shutdown: mockShutdown,
    messenger: {
      disconnect$: mockDisconnectSubject.asObservable(),
      connect$: mockConnectSubject.asObservable(),
    },
  })),
  senderOrigin: vi.fn(() => 'https://example.com'),
}));

vi.mock('webextension-polyfill', () => ({
  runtime: {
    reload: vi.fn(),
    onConnect: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
}));

const defaultConnectOptions = {
  baseChannelName: 'test-channel' as ChannelName,
  blockchainName: 'Midnight' as const,
  authorizedDapps$: NEVER,
  hasAccounts: vi.fn().mockResolvedValue(true),
};

const getExposedAuthenticator = (): AuthenticatorApi => {
  const calls = vi.mocked(exposeAuthenticatorApi).mock.calls;
  const lastCall = calls.at(-1);
  return lastCall![1].authenticator;
};

const mockSender = {
  tab: { id: 1, title: 'Test', favIconUrl: 'icon.png' },
  frameId: 0,
} as unknown as Parameters<AuthenticatorApi['haveAccess']>[0];

describe('dapp-connector-extension dependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectAuthenticator', () => {
    it('should expose authenticator API when subscribed', () => {
      const store = initializeStore({} as ModuleInitProps, {
        logger: dummyLogger,
      });

      expect(store.sideEffectDependencies?.connectAuthenticator).toBeDefined();

      const subscription = store.sideEffectDependencies
        ?.connectAuthenticator?.(defaultConnectOptions)
        .subscribe();

      expect(exposeAuthenticatorApi).toHaveBeenCalledWith(
        { baseChannel: 'test-channel' },
        expect.objectContaining({
          authenticator: expect.any(Object) as unknown,
          logger: dummyLogger,
        }),
      );

      subscription?.unsubscribe();
    });

    it('should clean up on unsubscribe', () => {
      const store = initializeStore({} as ModuleInitProps, {
        logger: dummyLogger,
      });

      const subscription = store.sideEffectDependencies
        ?.connectAuthenticator?.(defaultConnectOptions)
        .subscribe();

      subscription?.unsubscribe();

      expect(mockShutdown).toHaveBeenCalled();
    });

    describe('hasAccounts check', () => {
      it('haveAccess returns false when hasAccounts returns false', async () => {
        const store = initializeStore({} as ModuleInitProps, {
          logger: dummyLogger,
        });
        const hasAccounts = vi.fn().mockResolvedValue(false);
        const authorizedDapps$ = new BehaviorSubject<Dapp[]>([
          createMockDapp('https://example.com'),
        ]);

        const subscription = store.sideEffectDependencies
          ?.connectAuthenticator?.({
            ...defaultConnectOptions,
            authorizedDapps$: authorizedDapps$.asObservable(),
            hasAccounts,
          })
          .subscribe();

        const authenticator = getExposedAuthenticator();
        const hasAccess = await authenticator.haveAccess(mockSender);

        expect(hasAccess).toBe(false);
        expect(hasAccounts).toHaveBeenCalled();

        subscription?.unsubscribe();
      });

      it('haveAccess checks authorized dapps when hasAccounts returns true', async () => {
        const store = initializeStore({} as ModuleInitProps, {
          logger: dummyLogger,
        });
        const hasAccounts = vi.fn().mockResolvedValue(true);
        const authorizedDapps$ = new BehaviorSubject<Dapp[]>([
          createMockDapp('https://example.com'),
        ]);

        const subscription = store.sideEffectDependencies
          ?.connectAuthenticator?.({
            ...defaultConnectOptions,
            authorizedDapps$: authorizedDapps$.asObservable(),
            hasAccounts,
          })
          .subscribe();

        const authenticator = getExposedAuthenticator();
        const hasAccess = await authenticator.haveAccess(mockSender);

        expect(hasAccess).toBe(true);

        subscription?.unsubscribe();
      });

      it('requestAccess throws AuthenticatorError when hasAccounts returns false', async () => {
        const store = initializeStore({} as ModuleInitProps, {
          logger: dummyLogger,
        });
        const hasAccounts = vi.fn().mockResolvedValue(false);

        const subscription = store.sideEffectDependencies
          ?.connectAuthenticator?.({
            ...defaultConnectOptions,
            hasAccounts,
          })
          .subscribe();

        const authenticator = getExposedAuthenticator();

        await expect(
          authenticator.requestAccess(mockSender, { forceReauth: true }),
        ).rejects.toThrow(
          expect.objectContaining({
            name: 'AuthenticatorError',
            code: AuthenticatorErrorCode.NoWalletAvailable,
          }) as Error,
        );

        subscription?.unsubscribe();
      });

      it('requestAccess throws AuthenticatorError instance when hasAccounts returns false', async () => {
        const store = initializeStore({} as ModuleInitProps, {
          logger: dummyLogger,
        });
        const hasAccounts = vi.fn().mockResolvedValue(false);

        const subscription = store.sideEffectDependencies
          ?.connectAuthenticator?.({
            ...defaultConnectOptions,
            hasAccounts,
          })
          .subscribe();

        const authenticator = getExposedAuthenticator();

        try {
          await authenticator.requestAccess(mockSender, {
            forceReauth: true,
          });
          expect.unreachable('should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(AuthenticatorError);
          expect((error as AuthenticatorError).code).toBe(
            AuthenticatorErrorCode.NoWalletAvailable,
          );
          expect((error as AuthenticatorError).message).toContain('Midnight');
        }

        subscription?.unsubscribe();
      });

      it('requestAccess proceeds normally when hasAccounts returns true', async () => {
        const store = initializeStore({} as ModuleInitProps, {
          logger: dummyLogger,
        });
        const hasAccounts = vi.fn().mockResolvedValue(true);
        const accessRequests: unknown[] = [];

        const subscription = store.sideEffectDependencies
          ?.connectAuthenticator?.({
            ...defaultConnectOptions,
            hasAccounts,
          })
          .subscribe(request => accessRequests.push(request));

        const authenticator = getExposedAuthenticator();

        // requestAccess should not throw, but it returns a promise that
        // waits for done() callback, so we don't await it
        const requestPromise = authenticator.requestAccess(mockSender, {
          forceReauth: true,
        });

        // Wait for the access request to be emitted
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(accessRequests).toHaveLength(1);

        // Resolve the request
        (accessRequests[0] as { done: (v: boolean) => void }).done(true);
        const isGranted = await requestPromise;
        expect(isGranted).toBe(true);

        subscription?.unsubscribe();
      });
    });
  });

  describe('dappConnected$ and dappDisconnected$', () => {
    const setupDappConnectedTest = () => {
      const store = initializeStore({} as ModuleInitProps, {
        logger: dummyLogger,
      });
      const authorizedDapps$ = new BehaviorSubject<Dapp[]>([]);
      const dappConnectedEvents: unknown[] = [];

      const dappConnectedSub =
        store.sideEffectDependencies!.dappConnected$!.subscribe(event => {
          dappConnectedEvents.push(event);
        });

      const subscription = store.sideEffectDependencies
        ?.connectAuthenticator?.({
          ...defaultConnectOptions,
          authorizedDapps$: authorizedDapps$.asObservable(),
        })
        .subscribe();

      return {
        authorizedDapps$,
        dappConnectedEvents,
        dappConnectedSub,
        subscription,
      };
    };

    it('should expose dappConnected$ observable', () => {
      const store = initializeStore({} as ModuleInitProps, {
        logger: dummyLogger,
      });

      expect(store.sideEffectDependencies?.dappConnected$).toBeDefined();
      expect(
        typeof store.sideEffectDependencies?.dappConnected$?.subscribe,
      ).toBe('function');
    });

    it('should expose dappDisconnected$ observable', () => {
      const store = initializeStore({} as ModuleInitProps, {
        logger: dummyLogger,
      });

      expect(store.sideEffectDependencies?.dappDisconnected$).toBeDefined();
      expect(
        typeof store.sideEffectDependencies?.dappDisconnected$?.subscribe,
      ).toBe('function');
    });

    it('should emit dappConnected when an authorized dapp port connects', async () => {
      const {
        authorizedDapps$,
        dappConnectedEvents,
        dappConnectedSub,
        subscription,
      } = setupDappConnectedTest();

      // Set up authorized dapps
      const mockDapp = createMockDapp('https://example.com');
      authorizedDapps$.next([mockDapp]);

      // Simulate a port connection
      mockConnectSubject.next({
        sender: {
          tab: { id: 123 },
          frameId: 0,
        },
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(dappConnectedEvents).toHaveLength(1);
      expect(dappConnectedEvents[0]).toEqual({
        blockchainName: 'Midnight',
        source: {
          url: 'https://example.com',
          contextId: '123-0',
        },
      });

      subscription?.unsubscribe();
      dappConnectedSub?.unsubscribe();
    });

    it('should not emit dappConnected when an unauthorized dapp port connects', async () => {
      const {
        authorizedDapps$,
        dappConnectedEvents,
        dappConnectedSub,
        subscription,
      } = setupDappConnectedTest();

      // Set up authorized dapps (different from the connecting dapp)
      const mockDapp = createMockDapp('https://other-dapp.com');
      authorizedDapps$.next([mockDapp]);

      // Simulate a port connection from unauthorized dapp
      mockConnectSubject.next({
        sender: {
          tab: { id: 123 },
          frameId: 0,
        },
      });

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(dappConnectedEvents).toHaveLength(0);

      subscription?.unsubscribe();
      dappConnectedSub?.unsubscribe();
    });

    it('should emit dappDisconnected when a port disconnects', () => {
      const store = initializeStore({} as ModuleInitProps, {
        logger: dummyLogger,
      });

      const dappDisconnectedEvents: unknown[] = [];

      const dappDisconnectedSub =
        store.sideEffectDependencies!.dappDisconnected$!.subscribe(event => {
          dappDisconnectedEvents.push(event);
        });

      const subscription = store.sideEffectDependencies
        ?.connectAuthenticator?.(defaultConnectOptions)
        .subscribe();

      // Simulate a port disconnection
      mockDisconnectSubject.next({
        disconnected: {
          sender: {
            tab: { id: 456 },
            frameId: 1,
          },
        },
      });

      expect(dappDisconnectedEvents).toHaveLength(1);
      expect(dappDisconnectedEvents[0]).toBe('456-1');

      subscription?.unsubscribe();
      dappDisconnectedSub?.unsubscribe();
    });
  });
});
