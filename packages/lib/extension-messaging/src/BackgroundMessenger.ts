// only tested in ../e2e tests
import {
  BehaviorSubject,
  ReplaySubject,
  bufferCount,
  catchError,
  filter,
  first,
  from,
  map,
  mergeMap,
  of,
  pairwise,
  tap,
} from 'rxjs';

import { KEEP_ALIVE_MESSAGE, isKeepAliveMessage } from './util';
import { ChannelName } from './value-objects/channel-name.vo';

import type {
  DisconnectEvent,
  Messenger,
  MessengerDependencies,
  MessengerPort,
  PortMessage,
} from './types';
import type { Subject } from 'rxjs';
import type { Logger } from 'ts-log';

/**
 * Matches the throw `port.postMessage` raises for an already-closed port.
 *
 * Chrome says 'Attempting to use a disconnected port object', Firefox
 * 'Attempt to postMessage on disconnected port'. Neither gives the throw a
 * distinct type or code, so the message is the only thing that separates a
 * dead port from a payload that would not serialize.
 */
const DISCONNECTED_PORT_ERROR = /disconnected port/i;

export interface Channel {
  hasMethodRequestHandler?: boolean;
  message$: Subject<PortMessage>;
  ports$: BehaviorSubject<Set<MessengerPort>>;
}

/**
 * Intended to be used in service worker background process.
 * Manages connections with different parts of the extension.
 * Connections are managed through ports.
 * All other parts of extension are expected use NonBackgroundMessenger.
 * You won't be able to add any additional 'runtime.onConnect' listeners in background process once this is called.
 */
export const createBackgroundMessenger = ({
  logger,
  runtime,
}: MessengerDependencies) => {
  const channels = new Map<ChannelName, Channel>();
  const getChannel = (channelName: ChannelName) => {
    let channel = channels.get(channelName);
    if (!channel) {
      // Originally message$ was a 'new Subject()', but there seems to be a race between
      // - when it receives a value from 'onMessage'
      // - when message$ is subscribed to through `remoteApi`
      // It is most likely because event listener to onMessage is added during
      // createBackgroundMessenger and messenger on the other end emits immediately upon connection.
      channels.set(
        channelName,
        (channel = {
          message$: new ReplaySubject(1),
          ports$: new BehaviorSubject(new Set()),
        }),
      );
    }
    return channel;
  };
  const onPortMessage = (data: unknown, port: MessengerPort) => {
    if (isKeepAliveMessage(data)) {
      // Reserved transport-level ping. Mere receipt resets the SW idle timer;
      // the ack lets the consumer observe SW liveness without invoking user code.
      // A throwing ack means the port is dead, so release it here too rather than
      // let it linger until the next response post happens to hit the same port.
      postToPort(port, KEEP_ALIVE_MESSAGE);
      return;
    }
    logger.debug(`[BackgroundMessenger(${port.name})] message`, data);
    const { message$ } = channels.get(ChannelName(port.name))!;
    message$.next({ data, port });
  };
  // Idempotent: the native onDisconnect and the postToPort fallback can both
  // target the same port, but only the first shrinks ports$ — which is what
  // fires the channel's disconnect$, so a double-release must not double-fire it.
  const releasePort = (port: MessengerPort) => {
    const channel = channels.get(ChannelName(port.name));
    if (!channel?.ports$.value.has(port)) return;
    port.onMessage.removeListener(onPortMessage);
    port.onDisconnect.removeListener(releasePort);
    const newPorts = new Set(channel.ports$.value);
    newPorts.delete(port);
    channel.ports$.next(newPorts);
    logger.debug(`[BackgroundMessenger(${port.name})] disconnected`, port);
  };
  // Releases and disconnects a port whose post throws because the port is
  // gone, so no caller retries into it and the peer is free to reconnect.
  //
  // Every other throw leaves the port alone: `postMessage` also throws for a
  // payload it cannot serialize on a LIVE port, and this runs inside a
  // broadcast, so tearing down on that would drop every peer on the channel
  // over one bad message. A dead port that escapes the match is still released
  // by the native onDisconnect.
  //
  // Known limitation: the caller of such a message gets no answer at all.
  // Substituting one needs the message id, which this signature does not carry
  // — it also serves keepAlive acks and observable emissions.
  const postToPort = (port: MessengerPort, message: unknown) => {
    try {
      port.postMessage(message);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (!DISCONNECTED_PORT_ERROR.test(reason)) {
        logger.warn(
          `[BackgroundMessenger(${port.name})] postMessage threw on a live port`,
          error,
        );
        return;
      }
      logger.debug(
        `[BackgroundMessenger(${port.name})] postMessage threw; releasing port`,
        error,
      );
      releasePort(port);
      try {
        port.disconnect();
      } catch {
        // Already gone. Swallowed on purpose: this runs inside the broadcast
        // loop and inside a port event listener, so an escaping throw would
        // starve the ports after this one — the bug the release above exists
        // to prevent.
      }
    }
  };
  const onConnect = (port: MessengerPort) => {
    const { ports$ } = getChannel(ChannelName(port.name));
    const newPorts = new Set(ports$.value);
    newPorts.add(port);
    port.onMessage.addListener(onPortMessage);
    port.onDisconnect.addListener(releasePort);
    ports$.next(newPorts);
    logger.debug(`[BackgroundMessenger(${port.name})] connected`);
  };
  runtime.onConnect.addListener(onConnect);
  return {
    getChannel,

    /** Post to one port, releasing it as a disconnect if the post throws. */
    postToPort,

    /** Disconnect all existing ports and stop listening for new ones. */
    shutdown() {
      for (const channelName of [...channels.keys()]) {
        this.shutdownChannel(channelName);
      }
      runtime.onConnect.removeListener(onConnect);
      logger.warn('[BackgroundMessenger] shutdown');
    },

    shutdownChannel: (channelName: ChannelName) => {
      const channel = channels.get(channelName);
      if (!channel) return;
      channel.message$.complete();
      for (const port of channel.ports$.value) {
        port.disconnect();
      }
      channels.delete(channelName);
    },
  };
};

export type BackgroundMessenger = ReturnType<typeof createBackgroundMessenger>;

export interface BackgroundMessengerApiDependencies {
  logger: Logger;
  messenger: BackgroundMessenger;
}

export const generalizeBackgroundMessenger = (
  channel: ChannelName,
  messenger: BackgroundMessenger,
  logger: Logger,
): Messenger => ({
  channel,
  connect$: messenger.getChannel(channel).ports$.pipe(
    bufferCount(2, 1),
    mergeMap(([portsBefore, ports]) => {
      const diff = [...ports].filter(port => !portsBefore.has(port));
      return from(diff);
    }),
  ),
  deriveChannel: path =>
    generalizeBackgroundMessenger(
      ChannelName.derive(channel, path),
      messenger,
      logger,
    ),
  disconnect$: messenger.getChannel(channel).ports$.pipe(
    pairwise(),
    filter(([previous, current]) => previous.size > current.size),
    map(
      ([previous, current]): DisconnectEvent => ({
        disconnected: [...previous].find(p => !current.has(p))!,
        remaining: [...current],
      }),
    ),
  ),
  isShutdown: false,
  message$: messenger.getChannel(channel).message$,
  /**
   * Posts to every port on the channel, at most once each: `postToPort`
   * absorbs a failed post by releasing that port, so a caller never sees a
   * delivery error and nothing is re-sent to a replacement port.
   */
  postMessage: message => {
    const { ports$ } = messenger.getChannel(channel);
    return ports$.pipe(
      // wait for at least 1 port to be connected
      // to be able to post messages even before the other end comes alive
      filter(ports => ports.size > 0),
      first(),
      tap(ports => {
        for (const port of ports) messenger.postToPort(port, message);
      }),
      map(() => void 0),
      catchError(() => {
        logger.warn("Couldn't postMessage: messenger shutdown");
        return of(void 0);
      }),
    );
  },

  shutdown() {
    messenger.shutdownChannel(channel);
    this.isShutdown = true;
  },
});
