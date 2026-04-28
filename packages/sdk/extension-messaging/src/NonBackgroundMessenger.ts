// only tested in ../e2e tests
import { contextLogger, isNotNil } from '@cardano-sdk/util';
import { retryBackoff } from 'backoff-rxjs';
import {
  BehaviorSubject,
  EmptyError,
  ReplaySubject,
  Subject,
  catchError,
  debounceTime,
  defer,
  filter,
  first,
  map,
  of,
  takeWhile,
  tap,
} from 'rxjs';

import { ChannelName } from './value-objects/channel-name.vo';

import type {
  DeriveChannelOptions,
  DisconnectEvent,
  Messenger,
  MessengerDependencies,
  MessengerPort,
  PortMessage,
  ReconnectConfig,
} from './types';
import type { Observable } from 'rxjs';

export interface NonBackgroundMessengerOptions {
  baseChannel: ChannelName;
  /**
   * When true, defers runtime.connect() until the first actual use (e.g., postMessage).
   * Useful for content scripts to avoid waking the Service Worker on every webpage.
   */
  lazy?: boolean;
  reconnectConfig?: ReconnectConfig;
}

/** Creates and maintains a long-running connection to background process. Attempts to reconnect the port on disconnects. */
export const createNonBackgroundMessenger = (
  {
    baseChannel: channel,
    lazy = false,
    reconnectConfig: { initialDelay, maxDelay } = {
      initialDelay: 10,
      maxDelay: 1000,
    },
  }: NonBackgroundMessengerOptions,
  { logger: loggerStrategy, runtime }: MessengerDependencies,
): Messenger => {
  const logger = contextLogger(
    loggerStrategy,
    `NonBackgroundMessenger(${channel})`,
  );

  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  let delay = initialDelay;
  let isDestroyed = false;
  const disconnect$ = new Subject<DisconnectEvent>();
  const port$ = new BehaviorSubject<MessengerPort | 'shutdown' | null>(null);
  // Originally this was a 'new Subject()', but there seems to be a race between
  // - when it receives a value from 'onMessage'
  // - when message$ is subscribed to through `remoteApi`
  // It is most likely because event listener to onMessage is added during
  // createNonBackgroundMessenger and messenger on the other end emits immediately upon connection.
  const message$ = new ReplaySubject<PortMessage>(1);
  const connect = () => {
    logger.debug('connecting...');

    if (typeof port$.value === 'string' || port$.value) return;
    // assuming this doesn't throw
    const port = runtime.connect({ name: channel });
    port$.next(port);
    port.onDisconnect.addListener(onDisconnect);
    // TODO: reset 'delay' if onDisconnect not called somewhat immediately?
    port.onMessage.addListener(onMessage);
  };
  const reconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    delay = Math.min(Math.pow(delay, 2), maxDelay);
    reconnectTimeout = setTimeout(connect, delay);
  };
  const onMessage = (data: unknown, port: MessengerPort) => {
    logger.debug('message', data);
    delay = initialDelay;
    message$.next({ data, port });
  };
  const onDisconnect = (port: MessengerPort) => {
    logger.debug('disconnected');
    port.onMessage.removeListener(onMessage);
    port.onDisconnect.removeListener(onDisconnect);
    port$.next(isDestroyed ? 'shutdown' : null);

    if (!isDestroyed && runtime.lastError) {
      logger.warn('reconnecting', runtime.lastError);
      reconnect();
    } else {
      disconnect$.next({
        disconnected: port,
        remaining: [],
      });
    }
  };
  // When lazy: true, defer connection until first connect$ subscription (e.g., postMessage)
  // connect() has an early return guard if already connected, making repeated calls safe
  const connect$ = defer(() => {
    if (lazy) connect();
    return port$;
  }).pipe(
    debounceTime(10), // TODO: how long until onDisconnect() is called when the other end doesn't exist?
    filter(isNotNil),
    takeWhile((port): port is MessengerPort => typeof port !== 'string'),
  );

  if (!lazy) connect();
  const derivedMessengers = new Set<Messenger>();
  return {
    channel,
    connect$,
    deriveChannel: (path, { detached }: DeriveChannelOptions = {}) => {
      const messenger = createNonBackgroundMessenger(
        {
          baseChannel: ChannelName.derive(channel, path),
          lazy,
          reconnectConfig: { initialDelay, maxDelay },
        },
        { logger, runtime },
      );
      if (!detached) {
        derivedMessengers.add(messenger);
      }
      return messenger;
    },
    disconnect$,
    get isShutdown() {
      return isDestroyed;
    },
    message$,
    /**
     * @throws RxJS EmptyError if client is shutdown
     */
    postMessage: (message: unknown): Observable<void> =>
      connect$.pipe(
        first(),
        tap(port => {
          port.postMessage(message);
        }),
        retryBackoff({
          initialInterval: 10,
          maxInterval: 1000,
          shouldRetry: error => !(error instanceof EmptyError),
        }),
        map(() => void 0),
        catchError(() => {
          logger.warn("Couldn't postMessage: messenger shutdown");
          return of(void 0);
        }),
      ),

    shutdown: () => {
      isDestroyed = true;
      const port = port$.value;
      if (typeof port !== 'string') {
        port?.disconnect();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      for (const messenger of derivedMessengers.values()) {
        messenger.shutdown();
        derivedMessengers.delete(messenger);
      }
      port$.complete();
      disconnect$.complete();
      logger.debug('shutdown');
    },
  };
};

export type NonBackgroundMessenger = ReturnType<
  typeof createNonBackgroundMessenger
>;
