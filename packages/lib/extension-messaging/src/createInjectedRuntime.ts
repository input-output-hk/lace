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
  const connectWindow = ({
    name,
  }: Runtime.ConnectConnectInfoType): MessengerPort => {
    const channelName = ChannelName(name || '');
    const port: MessengerPort = {
      disconnect: noOp,
      name: channelName,
      onDisconnect: {
        addListener: noOp,
        removeListener: noOp,
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
    return port;
  };

  return {
    connect: connectWindow,
    onConnect: { addListener: noOp, removeListener: noOp },
  };
};
