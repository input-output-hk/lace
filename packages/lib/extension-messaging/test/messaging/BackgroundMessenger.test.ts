import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import {
  ChannelName,
  KEEP_ALIVE_MESSAGE,
  createBackgroundMessenger,
  generalizeBackgroundMessenger,
} from '../../src';

import type {
  DisconnectEvent,
  MessengerPort,
  MinimalRuntime,
  PortMessage,
} from '../../src';

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
    lastError: undefined,
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

/** Invoke the messenger's single onConnect listener with a freshly-made port. */
const connectPort = (runtime: MinimalRuntime, port: MessengerPort) => {
  vi.mocked(runtime.onConnect.addListener).mock.calls[0][0](port);
};

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

    it('releases the port and fires disconnect$ when the keepAlive ack throws', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const channelName = ChannelName('test-channel');
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      const channel = bg.getChannel(channelName);
      expect(channel.ports$.value.has(port)).toBe(true);

      vi.mocked(port.postMessage).mockImplementation(() => {
        throw new Error('Attempting to use a disconnected port object');
      });

      const onMessageCb = (
        port.onMessage.addListener as unknown as MockOnMessage
      ).mock.calls[0][0];
      onMessageCb(KEEP_ALIVE_MESSAGE, port);

      expect(channel.ports$.value.has(port)).toBe(false);
      expect(disconnects).toEqual([{ disconnected: port, remaining: [] }]);
    });
  });

  describe('port release on postMessage failure (dead-port starvation)', () => {
    const channelName = ChannelName('test-channel');
    const responseMessage = { messageId: '1', response: 'ok' };

    it('releases the port and fires disconnect$ when port.postMessage throws', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      const channel = bg.getChannel(channelName);
      expect(channel.ports$.value.has(port)).toBe(true);

      vi.mocked(port.postMessage).mockImplementation(() => {
        throw new Error('Attempting to use a disconnected port object');
      });

      messenger.postMessage(responseMessage).subscribe();

      expect(channel.ports$.value.has(port)).toBe(false);
      expect(disconnects).toEqual([{ disconnected: port, remaining: [] }]);
    });

    it('disconnects the port it releases so the peer is not left deaf', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      vi.mocked(port.postMessage).mockImplementation(() => {
        throw new Error('Attempting to use a disconnected port object');
      });

      messenger.postMessage(responseMessage).subscribe();

      // Distinct from the test above: releasing without disconnecting leaves
      // an otherwise-healthy peer holding a port nothing answers.
      expect(port.disconnect).toHaveBeenCalledTimes(1);
    });

    it('still delivers to the remaining ports when disconnect throws', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const portA = createMockPort(channelName);
      const portB = createMockPort(channelName);
      connectPort(runtime, portA);
      connectPort(runtime, portB);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      vi.mocked(portA.postMessage).mockImplementation(() => {
        throw new Error('Attempting to use a disconnected port object');
      });
      vi.mocked(portA.disconnect).mockImplementation(() => {
        throw new Error('disconnect blew up');
      });

      messenger.postMessage(responseMessage).subscribe();

      // The posts run in one loop over the port set, so a throw escaping the
      // release would starve every port behind the failing one.
      expect(portB.postMessage).toHaveBeenCalledWith(responseMessage);
      expect(bg.getChannel(channelName).ports$.value.has(portB)).toBe(true);
    });

    it('removes the port and fires disconnect$ on a native onDisconnect', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      const channel = bg.getChannel(channelName);
      expect(channel.ports$.value.has(port)).toBe(true);

      vi.mocked(port.onDisconnect.addListener).mock.calls[0][0](port);

      expect(channel.ports$.value.has(port)).toBe(false);
      expect(disconnects).toEqual([{ disconnected: port, remaining: [] }]);
    });

    it('keeps the port and delivers the message on a healthy post', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      const channel = bg.getChannel(channelName);
      messenger.postMessage(responseMessage).subscribe();

      expect(port.postMessage).toHaveBeenCalledWith(responseMessage);
      expect(channel.ports$.value.has(port)).toBe(true);
      expect(disconnects).toHaveLength(0);
      expect(port.disconnect).not.toHaveBeenCalled();
    });

    it('fires disconnect$ once when a released port later disconnects natively', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      vi.mocked(port.postMessage).mockImplementation(() => {
        throw new Error('Attempting to use a disconnected port object');
      });
      messenger.postMessage(responseMessage).subscribe();
      expect(disconnects).toHaveLength(1);

      // Simulate Chrome firing the native onDisconnect afterward.
      vi.mocked(port.onDisconnect.addListener).mock.calls[0][0](port);

      expect(disconnects).toHaveLength(1);
    });

    it('releases only the failing port and still delivers to healthy ports', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const portA = createMockPort(channelName);
      const portB = createMockPort(channelName);
      connectPort(runtime, portA);
      connectPort(runtime, portB);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      const channel = bg.getChannel(channelName);
      vi.mocked(portA.postMessage).mockImplementation(() => {
        throw new Error('Attempting to use a disconnected port object');
      });

      messenger.postMessage(responseMessage).subscribe();

      expect(channel.ports$.value.has(portA)).toBe(false);
      expect(channel.ports$.value.has(portB)).toBe(true);
      expect(portB.postMessage).toHaveBeenCalledWith(responseMessage);
      expect(portB.disconnect).not.toHaveBeenCalled();
      expect(disconnects).toEqual([
        { disconnected: portA, remaining: [portB] },
      ]);
    });

    it('keeps a live port whose post throws for anything but a disconnect', () => {
      const runtime = createMockRuntime();
      const bg = createBackgroundMessenger({ logger, runtime });
      const port = createMockPort(channelName);
      connectPort(runtime, port);

      const messenger = generalizeBackgroundMessenger(channelName, bg, logger);
      const disconnects: DisconnectEvent[] = [];
      messenger.disconnect$.subscribe(event => disconnects.push(event));

      const channel = bg.getChannel(channelName);
      // What Chrome throws for a payload it cannot serialize, on a port that
      // is still open.
      vi.mocked(port.postMessage).mockImplementation(() => {
        throw new Error('Could not serialize message.');
      });

      messenger.postMessage(responseMessage).subscribe();

      expect(channel.ports$.value.has(port)).toBe(true);
      expect(port.disconnect).not.toHaveBeenCalled();
      expect(disconnects).toEqual([]);
    });
  });
});
