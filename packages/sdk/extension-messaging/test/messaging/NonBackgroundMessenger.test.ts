import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChannelName, createNonBackgroundMessenger } from '../../src';

import type { MessengerPort, MinimalRuntime } from '../../src';
import type { MockedFunction } from 'vitest';

const createMockRuntime = (): MinimalRuntime & {
  mockPort: MessengerPort;
} => {
  const onDisconnect = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  const onMessage = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };
  const mockPort: MessengerPort = {
    disconnect: vi.fn(),
    name: 'test-channel',
    onDisconnect,
    onMessage,
    postMessage: vi.fn(),
  };

  return {
    connect: vi.fn().mockReturnValue(mockPort),
    lastError: undefined,
    mockPort,
    onConnect: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  };
};

describe('createNonBackgroundMessenger', () => {
  const logger = dummyLogger;

  describe('lazy option', () => {
    describe('lazy: false (default)', () => {
      it('calls runtime.connect() immediately on creation', () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        createNonBackgroundMessenger(
          { baseChannel: channel },
          { logger, runtime },
        );

        expect(runtime.connect).toHaveBeenCalledTimes(1);
        expect(runtime.connect).toHaveBeenCalledWith({ name: channel });
      });
    });

    describe('lazy: true', () => {
      it('does NOT call runtime.connect() on creation', () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        expect(runtime.connect).not.toHaveBeenCalled();
      });

      it('calls runtime.connect() on first postMessage', async () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        expect(runtime.connect).not.toHaveBeenCalled();

        // postMessage subscribes to connect$ which triggers connection
        messenger.postMessage({ test: 'message' }).subscribe();

        // Wait for debounceTime(10) in connect$
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(runtime.connect).toHaveBeenCalledTimes(1);
        expect(runtime.connect).toHaveBeenCalledWith({ name: channel });
      });

      it('calls runtime.connect() on first connect$ subscription', async () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        expect(runtime.connect).not.toHaveBeenCalled();

        messenger.connect$.subscribe();

        // Wait for defer and debounceTime
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(runtime.connect).toHaveBeenCalledTimes(1);
      });

      it('calling connect() multiple times is safe (early return guard)', async () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        // Multiple subscriptions should only call connect once
        messenger.connect$.subscribe();
        messenger.connect$.subscribe();
        messenger.connect$.subscribe();

        await new Promise(resolve => setTimeout(resolve, 20));

        // connect() has early return if already connected
        expect(runtime.connect).toHaveBeenCalledTimes(1);
      });
    });

    describe('derived channels inherit lazy option', () => {
      it('derived channel with lazy: true also defers connection', () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        expect(runtime.connect).not.toHaveBeenCalled();

        const derivedMessenger = messenger.deriveChannel('derived');

        // Neither parent nor derived should have connected yet
        expect(runtime.connect).not.toHaveBeenCalled();

        // Derived messenger is a new NonBackgroundMessenger instance
        expect(derivedMessenger.channel).toBe(
          ChannelName.derive(channel, 'derived'),
        );
      });

      it('derived channel with lazy: false connects immediately', () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: false },
          { logger, runtime },
        );

        // Parent connects immediately
        expect(runtime.connect).toHaveBeenCalledTimes(1);

        messenger.deriveChannel('derived');

        // Derived also connects immediately (inherits lazy: false)
        expect(runtime.connect).toHaveBeenCalledTimes(2);
      });
    });

    describe('shutdown works correctly with lazy connections', () => {
      it('shutdown works before connection is established', () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        expect(runtime.connect).not.toHaveBeenCalled();

        // Shutdown before any connection
        messenger.shutdown();

        expect(messenger.isShutdown).toBe(true);
        expect(runtime.mockPort.disconnect).not.toHaveBeenCalled();
      });

      it('shutdown works after connection is established', async () => {
        const runtime = createMockRuntime();
        const channel = ChannelName('test-channel');

        const messenger = createNonBackgroundMessenger(
          { baseChannel: channel, lazy: true },
          { logger, runtime },
        );

        // Trigger connection
        messenger.connect$.subscribe();
        await new Promise(resolve => setTimeout(resolve, 20));

        expect(runtime.connect).toHaveBeenCalledTimes(1);

        // Shutdown after connection
        messenger.shutdown();

        expect(messenger.isShutdown).toBe(true);
        expect(runtime.mockPort.disconnect).toHaveBeenCalled();
      });
    });
  });

  describe('reconnect on disconnect', () => {
    let runtime: ReturnType<typeof createMockRuntime>;
    type MockDisconnectListener = MockedFunction<
      typeof runtime.mockPort.onDisconnect.addListener
    >;

    beforeEach(() => {
      runtime = createMockRuntime();
    });

    it('does NOT emit disconnect$ when disconnected with runtime.lastError', () => {
      vi.useFakeTimers();
      const channel = ChannelName('test-channel');
      const disconnectEvents: unknown[] = [];

      const messenger = createNonBackgroundMessenger(
        { baseChannel: channel },
        { logger, runtime },
      );
      messenger.disconnect$.subscribe(event => disconnectEvents.push(event));

      runtime.lastError = new Error('Could not establish connection');
      const onDisconnectCb = (
        runtime.mockPort.onDisconnect.addListener as MockDisconnectListener
      ).mock.calls[0][0];
      onDisconnectCb(runtime.mockPort);

      vi.runAllTimers();
      expect(disconnectEvents).toHaveLength(0);
      vi.useRealTimers();
    });

    it('emits disconnect$ when disconnected without runtime.lastError', () => {
      vi.useFakeTimers();
      const channel = ChannelName('test-channel');
      const disconnectEvents: unknown[] = [];

      const messenger = createNonBackgroundMessenger(
        { baseChannel: channel },
        { logger, runtime },
      );
      messenger.disconnect$.subscribe(event => disconnectEvents.push(event));

      const onDisconnectCb = (
        runtime.mockPort.onDisconnect.addListener as MockDisconnectListener
      ).mock.calls[0][0];
      onDisconnectCb(runtime.mockPort);

      expect(disconnectEvents).toHaveLength(1);
      expect(disconnectEvents[0]).toEqual({
        disconnected: runtime.mockPort,
        remaining: [],
      });
      vi.useRealTimers();
    });

    it('reconnects when disconnected with a runtime.lastError', () => {
      vi.useFakeTimers();
      const channel = ChannelName('test-channel');

      createNonBackgroundMessenger(
        { baseChannel: channel },
        { logger, runtime },
      );
      expect(runtime.connect).toHaveBeenCalledTimes(1);

      // Simulate disconnect with a runtime error (background not listening)
      runtime.lastError = new Error('Could not establish connection');
      const onDisconnectCb = (
        runtime.mockPort.onDisconnect.addListener as MockDisconnectListener
      ).mock.calls[0][0];
      onDisconnectCb(runtime.mockPort);

      vi.runAllTimers();
      expect(runtime.connect).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('does not reconnect when disconnected without a runtime.lastError', () => {
      vi.useFakeTimers();
      const channel = ChannelName('test-channel');

      createNonBackgroundMessenger(
        { baseChannel: channel },
        { logger, runtime },
      );
      expect(runtime.connect).toHaveBeenCalledTimes(1);

      // Simulate clean disconnect (no runtime error)
      const onDisconnectCb = (
        runtime.mockPort.onDisconnect.addListener as MockDisconnectListener
      ).mock.calls[0][0];
      onDisconnectCb(runtime.mockPort);

      vi.runAllTimers();
      expect(runtime.connect).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });
});
