import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  ChannelName,
  KEEP_ALIVE_MESSAGE,
  createBackgroundMessenger,
} from '../../src';

import type { MessengerPort, MinimalRuntime, PortMessage } from '../../src';

type MockListenerAddListener<Callback extends (...args: never[]) => unknown> = {
  mock: { calls: Array<[Callback]> };
};
type MockOnConnect = MockListenerAddListener<(port: MessengerPort) => void>;
type MockOnMessage = MockListenerAddListener<
  (data: unknown, port: MessengerPort) => void
>;

const createMockRuntime = () => {
  const onConnect = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  const runtime: MinimalRuntime = {
    connect: vi.fn(),
    onConnect,
  };
  return runtime;
};

const createMockPort = (name: string): MessengerPort => ({
  disconnect: vi.fn(),
  name,
  onDisconnect: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  postMessage: vi.fn(),
});

describe('createBackgroundMessenger', () => {
  const logger = dummyLogger;

  describe('keepAlive ping handling', () => {
    it('acks the keepAlive ping back on the same port and does NOT broadcast to message$', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });

      const onConnectCb = (
        runtime.onConnect.addListener as unknown as MockOnConnect
      ).mock.calls[0][0];
      const port = createMockPort('test-channel');
      onConnectCb(port);

      const channel = bg.getChannel(ChannelName('test-channel'));
      const broadcast: PortMessage[] = [];
      channel.message$.subscribe(message => broadcast.push(message));

      const onMessageCb = (
        port.onMessage.addListener as unknown as MockOnMessage
      ).mock.calls[0][0];
      onMessageCb(KEEP_ALIVE_MESSAGE, port);

      expect(port.postMessage).toHaveBeenCalledTimes(1);
      expect(port.postMessage).toHaveBeenCalledWith(KEEP_ALIVE_MESSAGE);
      expect(broadcast).toHaveLength(0);
    });

    it('still broadcasts regular messages', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });

      const onConnectCb = (
        runtime.onConnect.addListener as unknown as MockOnConnect
      ).mock.calls[0][0];
      const port = createMockPort('test-channel');
      onConnectCb(port);

      const channel = bg.getChannel(ChannelName('test-channel'));
      const broadcast: PortMessage[] = [];
      channel.message$.subscribe(message => broadcast.push(message));

      const onMessageCb = (
        port.onMessage.addListener as unknown as MockOnMessage
      ).mock.calls[0][0];
      const data = { messageId: '1', request: { args: [], method: 'foo' } };
      onMessageCb(data, port);

      expect(port.postMessage).not.toHaveBeenCalled();
      expect(broadcast).toHaveLength(1);
      expect(broadcast[0].data).toEqual(data);
    });
  });
});
