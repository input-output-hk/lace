import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkTrezorSuiteReachable } from '../../src/extension/trezor-suite-probe';

class FakeWebSocket {
  public static instances: FakeWebSocket[] = [];
  public url: string;
  public closed = false;
  private readonly listeners: Record<string, (() => void)[]> = {};

  public constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  public addEventListener(type: string, callback: () => void) {
    (this.listeners[type] ??= []).push(callback);
  }

  public emit(type: string) {
    for (const callback of this.listeners[type] ?? []) callback();
  }

  public close() {
    this.closed = true;
  }
}

const stubExtensionContext = () => {
  vi.stubGlobal('chrome', { runtime: { id: 'extension-id' } });
};

describe('checkTrezorSuiteReachable', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('resolves null outside an extension context without opening a socket', async () => {
    await expect(checkTrezorSuiteReachable()).resolves.toBeNull();
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('resolves true and closes the socket when Suite accepts the connection', async () => {
    stubExtensionContext();
    const probe = checkTrezorSuiteReachable();
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe('ws://127.0.0.1:21335/connect-ws');
    socket.emit('open');
    await expect(probe).resolves.toBe(true);
    expect(socket.closed).toBe(true);
  });

  it('resolves false when the connection errors', async () => {
    stubExtensionContext();
    const probe = checkTrezorSuiteReachable();
    FakeWebSocket.instances[0].emit('error');
    await expect(probe).resolves.toBe(false);
  });

  it('resolves false when nothing answers before the timeout', async () => {
    vi.useFakeTimers();
    stubExtensionContext();
    const probe = checkTrezorSuiteReachable(1000);
    vi.advanceTimersByTime(1001);
    await expect(probe).resolves.toBe(false);
    expect(FakeWebSocket.instances[0].closed).toBe(true);
  });

  it('resolves false when the socket cannot be constructed', async () => {
    stubExtensionContext();
    vi.stubGlobal(
      'WebSocket',
      class {
        public constructor() {
          throw new Error('blocked by CSP');
        }
      },
    );
    await expect(checkTrezorSuiteReachable()).resolves.toBe(false);
  });
});
