/**
 * @vitest-environment jsdom
 */
import { dummyLogger } from 'ts-log';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ChannelName,
  FinalizationRegistryDestructor,
  RemoteApiPropertyType,
  RemoteApiShutdownError,
  consumeMessengerRemoteApi,
  createInjectedRuntime,
  createNonBackgroundMessenger,
} from '../../src';

type PageHideHandler = (event: { persisted: boolean }) => void;

/**
 * Replace window.addEventListener so the 'pagehide' handler registered by
 * createInjectedRuntime can be invoked directly — avoids relying on jsdom's
 * PageTransitionEvent and keeps each test isolated from real window listeners.
 */
const capturePageHideHandlers = (): PageHideHandler[] => {
  const handlers: PageHideHandler[] = [];
  vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
    if (type === 'pagehide')
      handlers.push(handler as unknown as PageHideHandler);
  });
  return handlers;
};

describe('createInjectedRuntime', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a single pagehide listener', () => {
    const handlers = capturePageHideHandlers();
    createInjectedRuntime('https://dapp.example');
    expect(handlers).toHaveLength(1);
    expect(window.addEventListener).toHaveBeenCalledWith(
      'pagehide',
      expect.any(Function),
    );
  });

  it('fires onDisconnect for every open port on pagehide(persisted:true)', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const portA = runtime.connect({ name: 'a' });
    const portB = runtime.connect({ name: 'b' });
    const onDisconnectA = vi.fn();
    const onDisconnectB = vi.fn();
    portA.onDisconnect.addListener(onDisconnectA);
    portB.onDisconnect.addListener(onDisconnectB);

    handlers[0]({ persisted: true });

    expect(onDisconnectA).toHaveBeenCalledWith(portA);
    expect(onDisconnectA).toHaveBeenCalledTimes(1);
    expect(onDisconnectB).toHaveBeenCalledWith(portB);
    expect(onDisconnectB).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onDisconnect on pagehide(persisted:false)', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const port = runtime.connect({ name: 'a' });
    const onDisconnect = vi.fn();
    port.onDisconnect.addListener(onDisconnect);

    handlers[0]({ persisted: false });

    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('does not fire a listener removed via removeListener', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const port = runtime.connect({ name: 'a' });
    const onDisconnect = vi.fn();
    port.onDisconnect.addListener(onDisconnect);
    port.onDisconnect.removeListener(onDisconnect);

    handlers[0]({ persisted: true });

    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('does not fire onDisconnect for a port that was explicitly disconnected', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const port = runtime.connect({ name: 'a' });
    const onDisconnect = vi.fn();
    port.onDisconnect.addListener(onDisconnect);
    port.disconnect();

    handlers[0]({ persisted: true });

    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('is a no-op on pagehide when a port has no onDisconnect listener', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');
    runtime.connect({ name: 'a' });

    expect(() => {
      handlers[0]({ persisted: true });
    }).not.toThrow();
  });

  it('fires every listener registered on a single port', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const port = runtime.connect({ name: 'a' });
    const listenerOne = vi.fn();
    const listenerTwo = vi.fn();
    port.onDisconnect.addListener(listenerOne);
    port.onDisconnect.addListener(listenerTwo);

    handlers[0]({ persisted: true });

    expect(listenerOne).toHaveBeenCalledWith(port);
    expect(listenerTwo).toHaveBeenCalledWith(port);
  });

  it('does not re-fire onDisconnect on a second pagehide (idempotent)', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const port = runtime.connect({ name: 'a' });
    const onDisconnect = vi.fn();
    port.onDisconnect.addListener(onDisconnect);

    handlers[0]({ persisted: true });
    handlers[0]({ persisted: true });

    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not fire a port connected from within a fired onDisconnect listener', () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');

    const portA = runtime.connect({ name: 'a' });
    const onDisconnectB = vi.fn();
    // Reentrancy: the listener connects a fresh port mid-fire; the pre-fire
    // snapshot must exclude it, so port-b's listener must not fire this pass.
    const onDisconnectA = vi.fn(() => {
      const portB = runtime.connect({ name: 'b' });
      portB.onDisconnect.addListener(onDisconnectB);
    });
    portA.onDisconnect.addListener(onDisconnectA);

    expect(() => {
      handlers[0]({ persisted: true });
    }).not.toThrow();

    expect(onDisconnectA).toHaveBeenCalledTimes(1);
    expect(onDisconnectB).not.toHaveBeenCalled();
  });

  it('rejects a pending remote method with RemoteApiShutdownError on pagehide(persisted:true)', async () => {
    const handlers = capturePageHideHandlers();
    const runtime = createInjectedRuntime('https://dapp.example');
    const messenger = createNonBackgroundMessenger(
      { baseChannel: ChannelName('wallet'), lazy: true },
      { logger: dummyLogger, runtime },
    );
    const destructor = new FinalizationRegistryDestructor(dummyLogger);
    const api = consumeMessengerRemoteApi<{
      signData: (...args: unknown[]) => Promise<unknown>;
    }>(
      {
        properties: { signData: RemoteApiPropertyType.MethodReturningPromise },
      },
      { destructor, logger: dummyLogger, messenger },
    );

    // Subscribes synchronously: connect() registers the injected port and its
    // onDisconnect before the debounce, and disconnect$ is subscribed too.
    const pending = api.signData('addr', 'payload');
    // Attach the rejection handler before firing so the rejection is awaited
    // (no unhandled-rejection warning).
    const assertion = expect(pending).rejects.toThrow(RemoteApiShutdownError);

    handlers[0]({ persisted: true });

    await assertion;
  });
});
