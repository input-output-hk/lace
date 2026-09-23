import { EMPTY, of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCardanoConfirmationCallback } from '../src/common/store/dependencies/create-confirmation-callback';

import type { CardanoConfirmationRequest } from '../src/common/store/dependencies/create-confirmation-callback';
import type { DisconnectEvent } from '@lace-lib/extension-messaging';
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

const senderWithTabId = (id: number): Runtime.MessageSender => {
  const base = createMockSender();
  return { ...base, tab: base.tab ? { ...base.tab, id } : undefined };
};

const senderWithFrame = (
  tabId: number,
  frameId: number,
): Runtime.MessageSender => {
  const base = createMockSender();
  return {
    ...base,
    frameId,
    tab: base.tab ? { ...base.tab, id: tabId } : undefined,
  };
};

const createDisconnectEvent = (
  sender: Runtime.MessageSender | undefined,
): DisconnectEvent => ({
  disconnected: { sender, postMessage: () => {} },
  remaining: [],
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
  let portDisconnected$: Subject<DisconnectEvent>;

  beforeEach(() => {
    emittedRequests = [];
    portDisconnected$ = new Subject<DisconnectEvent>();
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
        portDisconnected$,
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

      createCardanoConfirmationCallback(
        handleRequests,
        mockSubscriber,
        portDisconnected$,
      );

      expect(handleRequests).toHaveBeenCalled();
    });
  });

  describe('connect request', () => {
    it('creates a pending Promise for connect requests', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      const result = await callback(createMockSender(), 'connect');

      expect(result.outcome).toBe('confirmed');
    });

    it('includes dApp information from sender', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
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
          request.resolve({ outcome: 'rejected' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      const result = await callback(createMockSender(), 'connect');

      expect(result.outcome).toBe('rejected');
    });
  });

  describe('signTx request', () => {
    it('includes txHex and partialSign in request', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      await callback(createMockSender(), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      expect(emittedRequests[0].txHex).toBe('abcd1234');
      expect(emittedRequests[0].partialSign).toBe(false);
    });

    it('returns confirmed outcome when confirmed', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      const result = await callback(createMockSender(), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      expect(result.outcome).toBe('confirmed');
    });

    it('handles partialSign true', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
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
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      await callback(createMockSender(), 'signData', {
        address: 'addr_test1qz...',
        payload: 'deadbeef',
      });

      expect(emittedRequests[0].signDataAddress).toBe('addr_test1qz...');
      expect(emittedRequests[0].signDataPayload).toBe('deadbeef');
    });

    it('returns confirmed outcome when confirmed', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      const result = await callback(createMockSender(), 'signData', {
        address: 'addr_test1qz...',
        payload: 'deadbeef',
      });

      expect(result.outcome).toBe('confirmed');
    });
  });

  describe('port disconnect', () => {
    it('resolves disconnected when the matching port disconnects', async () => {
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            // Mirror util.ts: cancel the pending confirmation on disconnect.
            request.disconnected$?.subscribe(() => {
              request.resolve({ outcome: 'disconnected' });
            });
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      const promise = callback(createMockSender(), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      portDisconnected$.next(createDisconnectEvent(createMockSender()));

      const result = await promise;
      expect(result.outcome).toBe('disconnected');
    });

    it('ignores a disconnect from a different port', () => {
      const disconnectSpy = vi.fn();
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            request.disconnected$?.subscribe(disconnectSpy);
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      void callback(senderWithTabId(1), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      portDisconnected$.next(createDisconnectEvent(senderWithTabId(999)));

      expect(disconnectSpy).not.toHaveBeenCalled();
    });

    it('resolves disconnected when the same tab and frame disconnects', async () => {
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            request.disconnected$?.subscribe(() => {
              request.resolve({ outcome: 'disconnected' });
            });
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      const promise = callback(senderWithFrame(7, 0), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      portDisconnected$.next(createDisconnectEvent(senderWithFrame(7, 0)));

      const result = await promise;
      expect(result.outcome).toBe('disconnected');
    });

    it('ignores a disconnect from a different frame in the same tab', () => {
      const disconnectSpy = vi.fn();
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            request.disconnected$?.subscribe(disconnectSpy);
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      void callback(senderWithFrame(7, 0), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      portDisconnected$.next(createDisconnectEvent(senderWithFrame(7, 1)));

      expect(disconnectSpy).not.toHaveBeenCalled();
    });

    it('emits at most once and never completes', () => {
      const next = vi.fn();
      const complete = vi.fn();
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            request.disconnected$?.subscribe({ next, complete });
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      void callback(senderWithTabId(1), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      portDisconnected$.next(createDisconnectEvent(senderWithTabId(1)));
      portDisconnected$.next(createDisconnectEvent(senderWithTabId(1)));

      expect(next).toHaveBeenCalledTimes(1);
      expect(complete).not.toHaveBeenCalled();
    });

    it('replays the drop to a consumer that subscribes after it', () => {
      const late = vi.fn();
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => emittedRequests.push(request));
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      void callback(senderWithTabId(1), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      portDisconnected$.next(createDisconnectEvent(senderWithTabId(1)));
      emittedRequests[0].disconnected$?.subscribe(late);

      expect(late).toHaveBeenCalledTimes(1);
    });

    it('releases the wallet-api subscription once the request resolves', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'rejected' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      await callback(senderWithTabId(1), 'signTx', {
        txHex: 'abcd1234',
        partialSign: false,
      });

      expect(portDisconnected$.observed).toBe(false);
    });

    it('never fires disconnect when the sender has no tab id', () => {
      const disconnectSpy = vi.fn();
      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            request.disconnected$?.subscribe(disconnectSpy);
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
      );

      void callback({ url: 'https://test.com' }, 'connect');

      portDisconnected$.next(
        createDisconnectEvent({ url: 'https://test.com' }),
      );

      expect(disconnectSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles sender without tab information', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      await callback({ url: 'https://test.com' }, 'connect');

      expect(emittedRequests[0].requestingDapp.name).toBe('');
      expect(emittedRequests[0].requestingDapp.imageUrl).toBe('');
    });

    it('handles sender without URL', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
      );

      await callback({}, 'connect');

      expect(emittedRequests[0].requestingDapp.origin).toBe('');
      expect(emittedRequests[0].requestingDapp.id).toBe('');
    });

    it('handles multiple concurrent requests', async () => {
      const resolvers: Array<CardanoConfirmationRequest['resolve']> = [];

      const { callback } = createCardanoConfirmationCallback(
        (request$: Observable<CardanoConfirmationRequest>) => {
          request$.subscribe(request => {
            emittedRequests.push(request);
            resolvers.push(request.resolve);
          });
          return of(undefined);
        },
        mockSubscriber,
        portDisconnected$,
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
      resolvers[1]({ outcome: 'rejected' });
      resolvers[0]({ outcome: 'confirmed' });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.outcome).toBe('confirmed');
      expect(result2.outcome).toBe('rejected');
    });
  });

  describe('type constraints', () => {
    it('request type is correctly set', async () => {
      const { callback } = createCardanoConfirmationCallback(
        createMockHandleRequests(emittedRequests, request => {
          expect(request.type).toBe('connect');
          request.resolve({ outcome: 'confirmed' });
        }),
        mockSubscriber,
        portDisconnected$,
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
        portDisconnected$,
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
        portDisconnected$,
      );

      // Should not throw
      expect(() => {
        shutdown();
      }).not.toThrow();
    });
  });
});
