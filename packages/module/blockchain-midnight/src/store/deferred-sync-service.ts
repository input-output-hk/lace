/**
 * Deferred Shielded Sync Service
 *
 * This module implements the sync service for shielded wallets with deferred key acquisition.
 * Keys are only requested when an event actually needs to be applied (not for detection-only events).
 *
 * Addresses audit finding [M 305]: Keys are requested on-demand via AccountKeyManager.
 * AccountKeyManager handles caching and idle timeout internally.
 */

import { AuthenticationCancelledError } from '@lace-contract/signer';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { ZswapEvents } from '@midnight-ntwrk/wallet-sdk-indexer-client';
import {
  ConnectionHelper,
  WsSubscriptionClient,
} from '@midnight-ntwrk/wallet-sdk-indexer-client/effect';
import { EitherOps } from '@midnight-ntwrk/wallet-sdk-utilities';
import { WsURL } from '@midnight-ntwrk/wallet-sdk-utilities/networking';
import {
  Chunk,
  Duration,
  Effect,
  Either,
  ParseResult,
  pipe,
  Schema,
  Schedule,
  Stream,
} from 'effect';
import { filter, firstValueFrom, switchMap, take } from 'rxjs';

// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  type DefaultSyncConfiguration,
  EventsSyncUpdate as EventsSyncUpdateSchema,
  type EventsSyncUpdate,
  type SyncService,
  type WalletSyncUpdate,
} from '../../../../../node_modules/@midnight-ntwrk/wallet-sdk-shielded/dist/v1/Sync';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { SyncWalletError } from '../../../../../node_modules/@midnight-ntwrk/wallet-sdk-shielded/dist/v1/WalletError';

import type { AccountKeyManager } from '@lace-contract/midnight-context';
import type { CoreWallet } from '@midnight-ntwrk/wallet-sdk-shielded/v1';

export type CreateDeferredSyncStreamParams<E, R> = {
  eventStream: Stream.Stream<EventsSyncUpdate, E, R>;
  keyManager: AccountKeyManager;
  batchSize: number;
  initialAppliedIndex: bigint;
};

/**
 * Creates a deferred sync stream that:
 * 1. For events with id <= maxProcessedEventId: emits with cached or dummy ZswapSecretKeys (no key request)
 * 2. For events with id > maxProcessedEventId: subscribes to keyManager.keys$ (which handles caching)
 * 3. If keys$ errors with auth cancellation: waits for keys to become available (prevents SDK retry)
 * 4. If keys$ errors with other errors: stream errors (allows SDK retry for transient failures)
 *
 * Note: We subscribe to keys$ for each event that needs keys. AccountKeyManager internally
 * handles caching and returns cached keys immediately if available, resetting the idle timer.
 *
 * IMPORTANT: maxProcessedEventId tracking handles graphql-ws reconnection:
 * - graphql-ws has automatic reconnection with shouldRetry: () => true
 * - When WS reconnects, it re-sends subscriptions with ORIGINAL variables
 * - This causes events to be replayed from the beginning (id: 0 or initialAppliedIndex)
 * - maxProcessedEventId tracks the highest event we've processed
 * - Replayed events (id <= maxProcessedEventId) are skipped to prevent duplicate key requests
 *
 * IMPORTANT: Auth cancellation errors are handled specially to prevent SDK retry from creating
 * duplicate WebSocket subscriptions. When auth is cancelled:
 * - We wait for areKeysAvailable$ to become true
 * - Then retry getting keys internally
 * - This blocks the sync stream but doesn't propagate error to SDK
 * - SDK's Stream.retry (with exponential backoff) is NOT triggered
 */
export const createDeferredSyncStream = <E, R>({
  batchSize,
  eventStream,
  keyManager,
  initialAppliedIndex,
}: CreateDeferredSyncStreamParams<E, R>): Stream.Stream<
  WalletSyncUpdate,
  E | SyncWalletError,
  R
> => {
  // Track the maximum event ID we've processed during this stream's lifetime.
  // This survives graphql-ws reconnections within the same stream instance.
  // When graphql-ws reconnects, it replays events from the beginning - we skip
  // events we've already processed to prevent duplicate key requests.
  let maxProcessedEventId = initialAppliedIndex;
  let cachedZswapKeys: ledger.ZswapSecretKeys | null = null;

  const DUMMY_SEED = new Uint8Array(32);
  let dummyZswapKeys: ledger.ZswapSecretKeys | null = null;
  const getDummyZswapKeys = () => {
    dummyZswapKeys ??= ledger.ZswapSecretKeys.fromSeed(DUMMY_SEED);
    return dummyZswapKeys;
  };

  return pipe(
    eventStream,
    Stream.schedule(Schedule.spaced(Duration.millis(10))),
    Stream.groupedWithin(batchSize, Duration.millis(100)),
    Stream.map(Chunk.toArray),
    Stream.mapEffect((events: EventsSyncUpdate[]) => {
      const lastEventIndex = BigInt(events[events.length - 1].id);

      if (lastEventIndex <= maxProcessedEventId) {
        return Effect.succeed({
          updates: events,
          secretKeys: cachedZswapKeys ?? getDummyZswapKeys(),
        } satisfies WalletSyncUpdate);
      }

      maxProcessedEventId = lastEventIndex;

      return pipe(
        Effect.tryPromise({
          try: async () => {
            try {
              return await firstValueFrom(keyManager.keys$);
            } catch (error) {
              if (error instanceof AuthenticationCancelledError) {
                return await firstValueFrom(
                  keyManager.areKeysAvailable$.pipe(
                    filter(available => available),
                    take(1),
                    switchMap(() => keyManager.keys$),
                    take(1),
                  ),
                );
              }

              throw error;
            }
          },
          catch: (error: unknown) => {
            return new SyncWalletError({
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to get keys for sync',
              cause: error,
            });
          },
        }),
        Effect.map(keys => {
          cachedZswapKeys = keys.walletKeys.zswapSecretKeys;
          return {
            updates: events,
            secretKeys: keys.walletKeys.zswapSecretKeys,
          } satisfies WalletSyncUpdate;
        }),
      );
    }),
  );
};

// ============================================================================
// Schema definitions for decoding indexer events
// EventsSyncUpdateSchema is imported from SDK (line 24)
// EventsSyncUpdateFromPayload transform is replicated (SDK internal, not exported)
// ============================================================================

const Uint8ArraySchema = Schema.declare(
  (input): input is Uint8Array => input instanceof Uint8Array,
).annotations({ identifier: 'Uint8Array' });

const LedgerEventSchema = Schema.declare(
  (input): input is ledger.Event => input instanceof ledger.Event,
).annotations({ identifier: 'ledger.Event' });

const LedgerEventFromUint8Array = Schema.transformOrFail(
  Uint8ArraySchema,
  LedgerEventSchema,
  {
    encode: event =>
      Effect.try({
        try: () => event.serialize(),
        catch: error =>
          new ParseResult.Unexpected(error, 'Could not serialize ledger event'),
      }),
    decode: bytes =>
      Effect.try({
        try: () => ledger.Event.deserialize(bytes),
        catch: error =>
          new ParseResult.Unexpected(
            error,
            'Could not deserialize ledger event',
          ),
      }),
  },
);

const HexedLedgerEvent = pipe(
  Schema.Uint8ArrayFromHex,
  Schema.compose(LedgerEventFromUint8Array),
);

const EventsSyncUpdatePayload = Schema.Struct({
  id: Schema.Number,
  raw: Schema.String,
  maxId: Schema.Number,
});

const EventsSyncUpdateFromPayload = Schema.transformOrFail(
  EventsSyncUpdatePayload,
  EventsSyncUpdateSchema,
  {
    decode: input =>
      pipe(
        Schema.decodeUnknownEither(HexedLedgerEvent)(input.raw),
        Either.map(
          event =>
            ({
              _tag: 'EventsSyncUpdate',
              id: input.id,
              maxId: input.maxId,
              event,
            } as const),
        ),
        Either.mapLeft(
          error =>
            new ParseResult.Unexpected(
              error,
              'Failed to decode ledger event payload',
            ),
        ),
        EitherOps.toEffect,
      ),
    encode: output =>
      pipe(
        Schema.encodeEither(HexedLedgerEvent)(output.event),
        Either.map(raw => ({
          id: output.id,
          raw,
          maxId: output.maxId,
        })),
        Either.mapLeft(
          error =>
            new ParseResult.Unexpected(
              error,
              'Failed to encode ledger event payload',
            ),
        ),
        EitherOps.toEffect,
      ),
  },
);

// ============================================================================
// Deferred Shielded Sync Service Factory
// ============================================================================

/**
 * Creates a deferred shielded sync service that requests keys only when needed.
 *
 * Unlike the standard makeEventsSyncService which requires keys upfront,
 * this service defers key acquisition until an event actually needs to be applied.
 * Detection-only events (already processed) don't require keys.
 *
 * @param keyManager - The AccountKeyManager to request keys from when needed
 * @returns A factory function that creates the SyncService given configuration
 */
export const makeDeferredShieldedSyncService =
  (
    keyManager: AccountKeyManager,
  ): ((
    config: DefaultSyncConfiguration,
  ) => SyncService<CoreWallet, ledger.ZswapSecretKeys, WalletSyncUpdate>) =>
  config => ({
    updates: (state, _secretKeys) => {
      // Note: We ignore _secretKeys parameter - keys are fetched on-demand via keyManager
      const { indexerClientConnection, batchSize } = config;

      // Create WebSocket URL from configuration
      const webSocketUrlResult = ConnectionHelper.createWebSocketUrl(
        indexerClientConnection.indexerHttpUrl,
        indexerClientConnection.indexerWsUrl,
      );

      if (Either.isLeft(webSocketUrlResult)) {
        return Stream.fail(
          new SyncWalletError(
            new Error(
              `Could not derive WebSocket URL from indexer HTTP URL: ${webSocketUrlResult.left.message}`,
            ),
          ),
        );
      }

      const indexerWsUrlResult = WsURL.make(webSocketUrlResult.right);
      if (Either.isLeft(indexerWsUrlResult)) {
        return Stream.fail(
          new SyncWalletError(
            new Error(
              `Invalid indexer WS URL: ${indexerWsUrlResult.left.message}`,
            ),
          ),
        );
      }

      const indexerWsUrl = indexerWsUrlResult.right;

      // Get initial applied index from wallet state
      const initialAppliedIndex = state.progress?.appliedIndex ?? 0n;

      // Create the raw event stream from indexer
      const eventStream = pipe(
        ZswapEvents.run({ id: Number(initialAppliedIndex) }),
        Stream.provideLayer(
          WsSubscriptionClient.layer({
            url: indexerWsUrl,
            keepAlive: config.indexerClientConnection.keepAlive,
          }),
        ),
        Stream.mapError(error => new SyncWalletError(error)),
        Stream.mapEffect(subscription =>
          pipe(
            Schema.decodeUnknownEither(EventsSyncUpdateFromPayload)(
              subscription.zswapLedgerEvents,
            ),
            Either.mapLeft(error => new SyncWalletError(error)),
            EitherOps.toEffect,
          ),
        ),
      );

      // Transform to deferred sync stream
      return createDeferredSyncStream({
        eventStream,
        keyManager,
        batchSize: batchSize ?? 60,
        initialAppliedIndex,
      });
    },
  });
