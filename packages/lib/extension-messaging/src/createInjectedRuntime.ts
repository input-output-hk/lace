/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import {
  isPostMessageResponse,
  isRequestMessage,
  namespacedMethod,
} from './util';
import { ChannelName } from './value-objects';

import type { MessengerPort, MinimalRuntime } from './types';
import type { Runtime } from 'webextension-polyfill';

const noOp = () => void 0;

/**
 * Creates a runtime for injected scripts that communicates via window.postMessage.
 * Each connect() call creates a port filtered by the channel name passed to connect().
 */
export const createInjectedRuntime = (origin: string): MinimalRuntime => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listeners = new WeakMap<any, any>();
  // onDisconnect listeners per live port. These ports are synthetic — they carry
  // messages over window.postMessage, not a chrome.runtime port — so nothing
  // external ever signals that one has died. A single 'pagehide' handler
  // synthesizes it, otherwise a dApp call parked on a user confirmation could
  // never settle once the page stopped running.
  const disconnectListenersByPort = new Map<
    MessengerPort,
    Set<(port: MessengerPort) => void>
  >();
  const connectWindow = ({
    name,
  }: Runtime.ConnectConnectInfoType): MessengerPort => {
    const channelName = ChannelName(name || '');
    const disconnectListeners = new Set<(port: MessengerPort) => void>();
    const port: MessengerPort = {
      disconnect: () => {
        disconnectListenersByPort.delete(port);
      },
      name: channelName,
      onDisconnect: {
        addListener: listener => disconnectListeners.add(listener),
        removeListener: listener => disconnectListeners.delete(listener),
      },
      onMessage: {
        addListener: listener => {
          const wrappedListener = ({ data, source }: MessageEvent) => {
            if (
              source !== window ||
              !isPostMessageResponse(data) ||
              data.baseChannelName !== channelName
            )
              return;
            listener(data, port);
          };
          listeners.set(listener, wrappedListener);
          window.addEventListener('message', wrappedListener);
        },
        removeListener: listener => {
          const wrappedListener = listeners.get(listener);
          window.removeEventListener('message', wrappedListener);
          listeners.delete(listener);
        },
      },
      postMessage: originalMessage => {
        const message = isRequestMessage(originalMessage)
          ? {
              // modify method to `{channelName}#{method}` in order to
              // avoid conflicts with lace v1 dapp connector, which runs a
              // content script message proxy that also listens to the same
              // calls with the same method names
              ...originalMessage,
              request: {
                ...originalMessage.request,
                method: namespacedMethod(
                  channelName,
                  originalMessage.request.method,
                ),
              },
            }
          : originalMessage;
        window.postMessage(message, origin);
      },
    };
    disconnectListenersByPort.set(port, disconnectListeners);
    return port;
  };

  // Gate on persisted:true — only a genuine bfcache freeze. A normal unload
  // (persisted:false) discards the page, so nothing awaits the pending call.
  window.addEventListener('pagehide', event => {
    if (!event.persisted) return;
    // Snapshot: a fired listener may removeListener or connect() and so mutate
    // these collections mid-iteration.
    const openPorts = [...disconnectListenersByPort];
    for (const [port, portListeners] of openPorts) {
      disconnectListenersByPort.delete(port);
      const portListenersSnapshot = [...portListeners];
      for (const listener of portListenersSnapshot) listener(port);
    }
  });

  return {
    connect: connectWindow,
    onConnect: { addListener: noOp, removeListener: noOp },
  };
};
