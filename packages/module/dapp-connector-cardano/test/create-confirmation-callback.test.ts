import { EMPTY, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCardanoConfirmationCallback,
  type CardanoConfirmationRequest,
  type CardanoConfirmationResult,
} from '../src/common/store/dependencies/create-confirmation-callback';

import type { Subscriber, Observable } from 'rxjs';
import type { Runtime } from 'webextension-polyfill';

const createMockSender = (
  overrides: Partial<Runtime.MessageSender> = {},
): Runtime.MessageSender => ({
  tab: {
    id: 1,
    index: 0,
    windowId: 1,
    highlighted: true,
    active: true,
    pinned: false,
    incognito: false,
    title: 'Test DApp',
    url: 'https://test-dapp.example.com/app',
    favIconUrl: 'https://test-dapp.example.com/favicon.ico',
  },
  url: 'https://test-dapp.example.com/app',
  ...overrides,
});

const createMockHandleRequests = (
  emittedRequests: CardanoConfirmationRequest[],
  resolveWith: (request: CardanoConfirmationRequest) => void,
) => {
  return (request$: Observable<CardanoConfirmationRequest>) => {
    request$.subscribe(request => {
      emittedRequests.push(request);
      resolveWith(request);
    });
    return of(undefined);
  };
};

describe('createCardanoConfirmationCallback', () => {
  let mockSubscriber: Subscriber<unknown>;
  let emittedRequests: CardanoConfirmationRequest[];

  beforeEach(() => {
    emittedRequests = [];
    mockSubscriber = {
      next: vi.fn(),
      error: vi.fn(),
      complete: vi.fn(),
    } as unknown as Subscriber<unknown>;
  });

  describe('callback creation', () => {
    it('creates a callback function and shutdown function', () => {
      const result = createCardanoConfirmationCallback(
        () => EMPTY,
        mockSubscriber,
      );

      expect(typeof result.callback).toBe('function');
      expect(typeof result.shutdown).toBe('function');
    });

    it('subscribes handleRequests to the internal Subject', () => {
      const handleRequests = vi.fn(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => emittedRequests.push(request));
          return of(undefined);
        },
      );

      createCardanoConfirmationCallback(handleRequests, mockSubscriber);

      expect(handleRequests).toHaveBeenCalled();
    });
  });

  describe('connect request', () => {
    it('creates a pending Promise for connect requests', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          // Simulate user confirming - connect doesn't need accessAuthSecret
          (request.resolve as (r: { isConfirmed: boolean }) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'connect');

      expect(result.isConfirmed).toBe(true);
    });

    it('includes dApp information from sender', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: { isConfirmed: boolean }) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'connect');

      expect(emittedRequests[0].requestingDapp).toEqual({
        id: 'https://test-dapp.example.com',
        name: 'Test DApp',
        origin: 'https://test-dapp.example.com',
        imageUrl: 'https://test-dapp.example.com/favicon.ico',
      });
    });

    it('handles rejection', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: { isConfirmed: boolean }) => void)({
            isConfirmed: false,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'connect');

      expect(result.isConfirmed).toBe(false);
    });
  });

  describe('signTx request', () => {
    it('includes txHex and partialSign in request', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: CardanoConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      expect(emittedRequests[0].txHex).toBe('abcd1234');
      expect(emittedRequests[0].partialSign).toBe(false);
    });

    it('returns isConfirmed true when confirmed', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: CardanoConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      expect(result.isConfirmed).toBe(true);
    });

    it('handles partialSign true', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: CardanoConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signTx', {
        txHex: 'abcd1234',
        partialSign: true,
      });

      expect(emittedRequests[0].partialSign).toBe(true);
    });
  });

  describe('signData request', () => {
    it('includes address and payload in request', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: CardanoConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'signData', {
        address: 'addr_test1qz...',
        payload: 'deadbeef',
      });

      expect(emittedRequests[0].signDataAddress).toBe('addr_test1qz...');
      expect(emittedRequests[0].signDataPayload).toBe('deadbeef');
    });

    it('returns isConfirmed true when confirmed', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: CardanoConfirmationResult) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      const result = await callback(createMockSender(), 'signData', {
        address: 'addr_test1qz...',
        payload: 'deadbeef',
      });

      expect(result.isConfirmed).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles sender without tab information', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: { isConfirmed: boolean }) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback({ url: 'https://test.com' }, 'connect');

      expect(emittedRequests[0].requestingDapp.name).toBe('');
      expect(emittedRequests[0].requestingDapp.imageUrl).toBe('');
    });

    it('handles sender without URL', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          (request.resolve as (r: { isConfirmed: boolean }) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback({}, 'connect');

      expect(emittedRequests[0].requestingDapp.origin).toBe('');
      expect(emittedRequests[0].requestingDapp.id).toBe('');
    });

    it('handles multiple concurrent requests', async () => {
      const resolvers: Array<(result: { isConfirmed: boolean }) => void> = [];

      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            resolvers.push(
              request.resolve as (result: { isConfirmed: boolean }) => void,
            );
          });
          return of(undefined);
        },
        mockSubscriber,
      );

      const promise1 = callback(
        createMockSender({ url: 'https://dapp1.com' }),
        'connect',
      );
      const promise2 = callback(
        createMockSender({ url: 'https://dapp2.com' }),
        'connect',
      );

      expect(emittedRequests).toHaveLength(2);

      // Resolve in reverse order
      resolvers[1]({ isConfirmed: false });
      resolvers[0]({ isConfirmed: true });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.isConfirmed).toBe(true);
      expect(result2.isConfirmed).toBe(false);
    });
  });

  describe('type constraints', () => {
    it('request type is correctly set', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          expect(request.type).toBe('connect');
          (request.resolve as (r: { isConfirmed: boolean }) => void)({
            isConfirmed: true,
          });
        }),
        mockSubscriber,
      );

      await callback(createMockSender(), 'connect');
    });
  });

  describe('shutdown', () => {
    it('prevents further requests from being processed after shutdown', async () => {
      const processedRequests: CardanoConfirmationRequest[] = [];
      const { callback, shutdown } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            processedRequests.push(request);
            // Don't resolve - we're testing that requests aren't processed after shutdown
          });
          return of(undefined);
        },
        mockSubscriber,
      );

      // Call shutdown before making any requests
      shutdown();

      // Try to make a request after shutdown - it should not be processed
      // (the Subject is completed, so it won't emit)
      const requestPromise = callback(createMockSender(), 'connect');

      // Give some time for any potential async processing
      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });

      // No requests should have been processed since Subject was completed
      expect(processedRequests).toHaveLength(0);

      // Clean up the pending promise (it will never resolve, but that's expected)
      void requestPromise;
    });

    it('can be called safely', () => {
      const { shutdown } = createCardanoConfirmationCallback(
        () => of(undefined),
        mockSubscriber,
      );

      // Should not throw
      expect(() => {
        shutdown();
      }).not.toThrow();
    });
  });
});
