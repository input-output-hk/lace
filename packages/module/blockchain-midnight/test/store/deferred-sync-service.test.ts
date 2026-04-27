import { AuthenticationCancelledError } from '@lace-contract/signer';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { Effect, pipe, Stream } from 'effect';
import { BehaviorSubject, of, Subject, Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { createDeferredSyncStream } from '../../src/store/deferred-sync-service';

// eslint-disable-next-line @nx/enforce-module-boundaries
import type { EventsSyncUpdate } from '../../../../../node_modules/@midnight-ntwrk/wallet-sdk-shielded/dist/v1/Sync';
import type {
  AccountKeyManager,
  AccountKeys,
} from '@lace-contract/midnight-context';
import type { MockedObject } from 'vitest';

const createMockAccountKeys = (): MockedObject<AccountKeys> => {
  // ZswapSecretKeys.fromSeed requires a 32-byte seed
  const dustKeyBuffer = new Uint8Array(32).fill(1);
  const zswapKeyBuffer = new Uint8Array(32).fill(2);
  // Pre-compute ledger key objects (matching real implementation)
  const dustSecretKey = ledger.DustSecretKey.fromSeed(dustKeyBuffer);
  const zswapSecretKeys = ledger.ZswapSecretKeys.fromSeed(zswapKeyBuffer);
  const clear = vi.fn();

  return {
    unshieldedKeystore: {
      getPublicKey: vi.fn(),
      signData: vi.fn(),
    } as unknown as AccountKeys['unshieldedKeystore'],
    walletKeys: {
      dustKeyBuffer,
      zswapKeyBuffer,
      dustSecretKey,
      zswapSecretKeys,
    },
    clear,
  } as unknown as MockedObject<AccountKeys>;
};

const createMockKeyManager = () => {
  const keys$ = new Subject<AccountKeys>();
  const areKeysAvailable$ = new BehaviorSubject<boolean>(false);

  return {
    keyManager: {
      keys$: keys$.asObservable(),
      areKeysAvailable$: areKeysAvailable$.asObservable(),
      destroy: vi.fn(),
    } as AccountKeyManager,
    emitKeys: (keys: AccountKeys) => {
      keys$.next(keys);
    },
    errorKeys: (error: Error) => {
      keys$.error(error);
    },
    completeKeys: () => {
      keys$.complete();
    },
  };
};

const createMockEvent = (id: number, maxId: number): EventsSyncUpdate => ({
  _tag: 'EventsSyncUpdate',
  id,
  maxId,
  event: {} as unknown as ledger.Event,
});

/**
 * Helper to run Effect Stream and collect results
 */
const runStream = async <A, E>(
  stream: Stream.Stream<A, E>,
  take = 10,
): Promise<{ items: A[]; error?: E }> => {
  const items: A[] = [];
  let error: E | undefined;

  const program = pipe(
    stream,
    Stream.take(take),
    Stream.runForEach(item =>
      Effect.sync(() => {
        items.push(item);
      }),
    ),
    Effect.catchAll((caughtError: E) =>
      Effect.sync(() => {
        error = caughtError;
      }),
    ),
  );

  await Effect.runPromise(program);
  return { items, error };
};

describe('createDeferredSyncStream', () => {
  const batchSize = 1;

  describe('Detection Phase (no keys required)', () => {
    it('does not subscribe to keys$ when all events have index <= appliedIndex', async () => {
      // Arrange
      const keysSubscribed = vi.fn();
      const mockKeys$ = new Observable<AccountKeys>(_subscriber => {
        keysSubscribed();
        // Never emit - we're testing that this is never subscribed
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      // Events with ids 98, 99, 100 - all <= appliedIndex (100)
      const events = [
        createMockEvent(98, 100),
        createMockEvent(99, 100),
        createMockEvent(100, 100),
      ];
      const eventStream = Stream.fromIterable(events);

      // Act
      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 3);

      // Assert
      expect(keysSubscribed).not.toHaveBeenCalled();
      expect(items).toHaveLength(3);
    });

    it('emits WalletSyncUpdate with dummy ZswapSecretKeys for events <= appliedIndex', async () => {
      const { keyManager } = createMockKeyManager();

      const events = [createMockEvent(50, 100), createMockEvent(100, 100)];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 2);

      expect(items).toHaveLength(2);
      // Both use the same memoized dummy instance (no key request was made)
      expect(items[0].secretKeys).toBe(items[1].secretKeys);
    });
  });

  describe('Apply Phase (keys required)', () => {
    it('subscribes to keys$ for each event > appliedIndex (AccountKeyManager handles caching)', async () => {
      let subscriptionCount = 0;
      const mockKeys = createMockAccountKeys();

      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        subscriptionCount++;
        // Simulate AccountKeyManager returning cached keys immediately
        subscriber.next(mockKeys);
        subscriber.complete();
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      // Multiple events > appliedIndex
      const events = [
        createMockEvent(101, 105),
        createMockEvent(102, 105),
        createMockEvent(103, 105),
      ];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 3);

      // Each event subscribes to keys$ (AccountKeyManager handles caching internally)
      expect(subscriptionCount).toBe(3);
      expect(items).toHaveLength(3);
    });

    it('mixes detection and apply events correctly', async () => {
      const mockKeys = createMockAccountKeys();
      let subscriptionCount = 0;

      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        subscriptionCount++;
        subscriber.next(mockKeys);
        subscriber.complete();
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      // Mixed: detection (99, 100), apply (101, 102)
      const events = [
        createMockEvent(99, 102), // detection
        createMockEvent(100, 102), // detection
        createMockEvent(101, 102), // apply - subscribes to keys$
        createMockEvent(102, 102), // apply - subscribes to keys$ again
      ];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 4);

      expect(items).toHaveLength(4);
      // Each apply event subscribes to keys$ (AccountKeyManager handles caching)
      expect(subscriptionCount).toBe(2);

      const realKeys = mockKeys.walletKeys.zswapSecretKeys;

      // First two are detection-only (dummy keys, no key request)
      expect(items[0].secretKeys).toBe(items[1].secretKeys);
      expect(items[0].secretKeys).not.toBe(realKeys);

      // Last two have the real keys from keyManager
      expect(items[2].secretKeys).toBe(realKeys);
      expect(items[3].secretKeys).toBe(realKeys);
    });
  });

  describe('User Cancellation', () => {
    it('waits for keys when auth is cancelled (prevents SDK retry)', async () => {
      const authError = new AuthenticationCancelledError();
      const mockKeys = createMockAccountKeys();

      // Track subscription attempts
      let subscriptionAttempt = 0;
      const areKeysAvailable$ = new BehaviorSubject<boolean>(false);

      // First subscription throws auth error, subsequent ones succeed
      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        subscriptionAttempt++;
        if (subscriptionAttempt === 1) {
          // First attempt: auth cancelled
          subscriber.error(authError);
        } else {
          // After waiting for areKeysAvailable$, keys are available
          subscriber.next(mockKeys);
          subscriber.complete();
        }
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: areKeysAvailable$.asObservable(),
        destroy: vi.fn(),
      };

      const events = [createMockEvent(101, 101)]; // > appliedIndex, needs keys
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      // Start stream processing (it will wait for keys)
      const resultPromise = runStream(syncStream, 1);

      // Simulate keys becoming available after a short delay
      await new Promise(resolve => setTimeout(resolve, 10));
      areKeysAvailable$.next(true);

      const { items, error } = await resultPromise;

      // Stream should succeed without error
      expect(error).toBeUndefined();
      expect(items).toHaveLength(1);
      // Keys were fetched successfully after waiting
      expect(subscriptionAttempt).toBe(2); // First attempt failed, second succeeded
    });

    it('errors stream when non-auth error occurs (allows SDK retry)', async () => {
      const networkError = new Error('Network connection failed');

      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        subscriber.error(networkError);
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      const events = [createMockEvent(101, 101)]; // > appliedIndex, needs keys
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items, error } = await runStream(syncStream, 1);

      // Non-auth errors should still propagate (for SDK retry on transient failures)
      expect(items).toHaveLength(0);
      expect(error).toBeDefined();
      expect((error as Error).message).toContain('Network connection failed');
    });

    it('errors stream when keys$ completes without emitting', async () => {
      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        // Complete without emitting
        subscriber.complete();
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      const events = [createMockEvent(101, 101)];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items, error } = await runStream(syncStream, 1);

      expect(items).toHaveLength(0);
      expect(error).toBeDefined();
    });
  });

  describe('WebSocket Reconnection (replayed events)', () => {
    it('skips replayed events after processing higher event IDs (simulates WS reconnect)', async () => {
      const mockKeys = createMockAccountKeys();
      let subscriptionCount = 0;

      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        subscriptionCount++;
        subscriber.next(mockKeys);
        subscriber.complete();
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      // Simulate: initial events 101, 102, 103 processed
      // Then WS reconnects and replays from the beginning (including events 101, 102)
      // These replayed events should be skipped (no key requests)
      const events = [
        createMockEvent(101, 105), // First time: apply (needs keys)
        createMockEvent(102, 105), // First time: apply (needs keys)
        createMockEvent(103, 105), // First time: apply (needs keys)
        // Simulated WS reconnect - replays from beginning
        createMockEvent(101, 105), // Replayed: should be skipped
        createMockEvent(102, 105), // Replayed: should be skipped
        createMockEvent(103, 105), // Replayed: should be skipped
        createMockEvent(104, 105), // New: apply (needs keys)
      ];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 7);

      // All 7 events should emit (replayed events emit with detection-only resource)
      expect(items).toHaveLength(7);

      // Only 4 subscriptions: 101, 102, 103, 104 (replayed 101, 102, 103 are skipped)
      expect(subscriptionCount).toBe(4);

      const realKeys = mockKeys.walletKeys.zswapSecretKeys;

      // First 3 events have the real keys from keyManager
      expect(items[0].secretKeys).toBe(realKeys);
      expect(items[1].secretKeys).toBe(realKeys);
      expect(items[2].secretKeys).toBe(realKeys);

      // Replayed events (items 3, 4, 5) use cached real keys (no new key request)
      expect(items[3].secretKeys).toBe(realKeys);
      expect(items[4].secretKeys).toBe(realKeys);
      expect(items[5].secretKeys).toBe(realKeys);

      // New event (104) has the real keys
      expect(items[6].secretKeys).toBe(realKeys);
    });

    it('updates maxProcessedEventId correctly for each new event', async () => {
      const mockKeys = createMockAccountKeys();
      let subscriptionCount = 0;

      const mockKeys$ = new Observable<AccountKeys>(subscriber => {
        subscriptionCount++;
        subscriber.next(mockKeys);
        subscriber.complete();
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      // Events arrive in non-sequential order:
      // - 101: first new event, maxProcessedEventId: 100 → 101
      // - 105: new event (105 > 101), maxProcessedEventId: 101 → 105
      // - 102: replayed (102 <= 105), should be SKIPPED
      // - 110: new event (110 > 105), maxProcessedEventId: 105 → 110
      const events = [
        createMockEvent(101, 110),
        createMockEvent(105, 110),
        createMockEvent(102, 110), // Replayed: 102 <= 105, skip
        createMockEvent(110, 110),
      ];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 4);

      expect(items).toHaveLength(4);

      // Only 3 subscriptions (101, 105, 110) - event 102 is replayed and skipped
      expect(subscriptionCount).toBe(3);

      const realKeys = mockKeys.walletKeys.zswapSecretKeys;

      // Events 101, 105 have the real keys from keyManager
      expect(items[0].secretKeys).toBe(realKeys);
      expect(items[1].secretKeys).toBe(realKeys);

      // Event 102 uses cached real keys (replayed since 102 <= 105, no new key request)
      expect(items[2].secretKeys).toBe(realKeys);

      // Event 110 has the real keys
      expect(items[3].secretKeys).toBe(realKeys);
    });

    it('does not request keys for events replayed during initial detection phase', async () => {
      const keysSubscribed = vi.fn();
      const mockKeys$ = new Observable<AccountKeys>(_subscriber => {
        keysSubscribed();
        // Never emit - we're testing that this is never subscribed
      });

      const keyManager: AccountKeyManager = {
        keys$: mockKeys$,
        areKeysAvailable$: of(false),
        destroy: vi.fn(),
      };

      // All events are <= initialAppliedIndex (detection-only)
      // Even if they arrive out of order (simulating replay)
      const events = [
        createMockEvent(98, 100),
        createMockEvent(100, 100),
        createMockEvent(99, 100), // Out of order
        createMockEvent(97, 100), // Out of order
      ];
      const eventStream = Stream.fromIterable(events);

      const syncStream = createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize,
        initialAppliedIndex: 100n,
      });

      const { items } = await runStream(syncStream, 4);

      expect(keysSubscribed).not.toHaveBeenCalled();
      expect(items).toHaveLength(4);
      // All share the same memoized dummy ZswapSecretKeys (no key request made)
      const dummyKeys = items[0].secretKeys;
      items.forEach(item => {
        expect(item.secretKeys).toBe(dummyKeys);
      });
    });
  });
});
