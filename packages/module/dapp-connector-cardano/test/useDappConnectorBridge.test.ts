/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { v4 as uuidv4 } from 'uuid';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as hooksModule from '../src/common/hooks';
import { useDappConnectorBridge } from '../src/mobile/hooks/useDappConnectorBridge';

vi.hoisted(() => {
  // @ts-expect-error __DEV__ is a React Native global
  globalThis.__DEV__ = false;
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => TOKEN),
}));

vi.mock('../src/common/hooks', () => ({
  useLaceSelector: vi.fn(),
  useDispatchLaceAction: vi.fn(() => vi.fn()),
}));

const TOKEN = 'fixed-bridge-token';
const LAUNCH_ORIGIN = 'https://launch.example';
const DOC_ORIGIN = 'https://dapp.example';

const mockUseLaceSelector = vi.mocked(hooksModule.useLaceSelector);
const mockUseDispatchLaceAction = vi.mocked(hooksModule.useDispatchLaceAction);

type DispatchLaceActionReturn = ReturnType<
  typeof hooksModule.useDispatchLaceAction
>;

const dispatchReceive = vi.fn();
const dispatchClear = vi.fn();

type QueuedResponse = {
  id: string;
  success: boolean;
  result?: unknown;
  timestamp: number;
};

type IncomingArgument = {
  message: Record<string, unknown>;
  dappOrigin: string;
};

// Mutable queue the response effect reads through the mocked selector.
// eslint-disable-next-line functional/no-let
let responseQueue: QueuedResponse[] = [];

const envelope = (
  overrides: Partial<{
    id: string;
    type: string;
    token: unknown;
    nonce: unknown;
    origin: unknown;
  }> = {},
): string =>
  JSON.stringify({
    source: 'lace-cip30',
    id: overrides.id ?? 'req-1',
    type: overrides.type ?? 'isEnabled',
    args: [],
    token: 'token' in overrides ? overrides.token : TOKEN,
    nonce: 'nonce' in overrides ? overrides.nonce : 'nonce-1',
    origin: 'origin' in overrides ? overrides.origin : DOC_ORIGIN,
  });

const renderBridge = () =>
  renderHook(() =>
    useDappConnectorBridge({
      dappOrigin: LAUNCH_ORIGIN,
      injectionConfig: { debug: false },
    }),
  );

describe('useDappConnectorBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responseQueue = [];
    mockUseLaceSelector.mockImplementation((key: string) =>
      key === 'cardanoDappConnector.selectWebViewResponseQueue'
        ? responseQueue
        : null,
    );
    mockUseDispatchLaceAction.mockImplementation((name: string) =>
      name === 'cardanoDappConnector.receiveWebViewMessage'
        ? (dispatchReceive as unknown as DispatchLaceActionReturn)
        : (dispatchClear as unknown as DispatchLaceActionReturn),
    );
  });

  afterEach(() => {
    responseQueue = [];
  });

  describe('token gate (Defense A)', () => {
    it('dispatches a message that carries the expected token', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope());
      });

      expect(dispatchReceive).toHaveBeenCalledTimes(1);
      const call = dispatchReceive.mock.calls[0][0] as IncomingArgument;
      expect(call.message).toEqual({
        source: 'lace-cip30',
        id: 'req-1',
        type: 'isEnabled',
        args: [],
      });
      expect(call.message).not.toHaveProperty('token');
      expect(call.message).not.toHaveProperty('nonce');
    });

    it('drops a message with the wrong token', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope({ token: 'nope' }));
      });

      expect(dispatchReceive).not.toHaveBeenCalled();
    });

    it('drops a message with no token', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope({ token: undefined }));
      });

      expect(dispatchReceive).not.toHaveBeenCalled();
    });

    it('rejects token-less/empty-token messages even if the bridge token is degenerate', () => {
      vi.mocked(uuidv4).mockReturnValueOnce(
        '' as unknown as ReturnType<typeof uuidv4>,
      );
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope({ token: undefined }));
      });
      act(() => {
        result.current.webViewProps.onMessage?.(envelope({ token: '' }));
      });

      expect(dispatchReceive).not.toHaveBeenCalled();
    });

    it('rejects a token-valid message that carries no nonce', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope({ nonce: undefined }));
      });

      expect(dispatchReceive).not.toHaveBeenCalled();
    });

    it('rejects a token-valid message with an empty nonce', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope({ nonce: '' }));
      });

      expect(dispatchReceive).not.toHaveBeenCalled();
    });
  });

  describe('origin attribution (Defense C)', () => {
    it('attributes a request to the origin its runtime stamped on the message', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(
          envelope({ origin: 'https://dapp.example' }),
        );
      });

      const call = dispatchReceive.mock.calls[0][0] as IncomingArgument;
      expect(call.dappOrigin).toBe('https://dapp.example');
    });

    it('attributes by the message origin, not by navigation state', () => {
      const { result } = renderBridge();

      // A main-frame navigation must not change attribution: the request keeps
      // the origin its own runtime asserted.
      act(() => {
        result.current.webViewProps.onLoadStart?.('https://other.example');
      });
      act(() => {
        result.current.webViewProps.onMessage?.(
          envelope({ origin: 'https://dapp.example' }),
        );
      });

      const call = dispatchReceive.mock.calls[0][0] as IncomingArgument;
      expect(call.dappOrigin).toBe('https://dapp.example');
    });

    it('rejects a token-valid message that carries no origin', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(
          envelope({ origin: undefined }),
        );
      });

      expect(dispatchReceive).not.toHaveBeenCalled();
    });

    it('strips the origin field before Redux', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope());
      });

      const call = dispatchReceive.mock.calls[0][0] as IncomingArgument;
      expect(call.message).not.toHaveProperty('origin');
    });
  });

  describe('nav-bar hostname (display only)', () => {
    it('follows the live document origin from its messages', () => {
      const { result } = renderBridge();
      expect(result.current.currentHostname).toBe('launch.example');

      act(() => {
        result.current.webViewProps.onMessage?.(
          envelope({ origin: 'https://other.example' }),
        );
      });

      expect(result.current.currentHostname).toBe('other.example');
    });

    it('does not update from a message that fails the token gate', () => {
      const { result } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(
          envelope({ token: 'nope', origin: 'https://evil.example' }),
        );
      });

      expect(result.current.currentHostname).toBe('launch.example');
    });
  });

  describe('response binding (Defense B)', () => {
    it('injects the response with the recorded document nonce', () => {
      const inject = vi.fn();
      const { result, rerender } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope());
      });
      act(() => {
        result.current.setInjectJavaScript(inject);
      });

      responseQueue = [
        { id: 'req-1', success: true, result: 'WITNESS', timestamp: 0 },
      ];
      act(() => {
        rerender();
      });

      expect(inject).toHaveBeenCalledTimes(1);
      const script = inject.mock.calls[0][0] as string;
      expect(script).toContain('"nonce":"nonce-1"');
      expect(script).toContain('WITNESS');
    });

    it('drops a pending response after the top frame navigates away', () => {
      const inject = vi.fn();
      const { result, rerender } = renderBridge();

      act(() => {
        result.current.webViewProps.onMessage?.(envelope());
      });
      act(() => {
        result.current.setInjectJavaScript(inject);
      });
      // The requesting document navigates away before its response arrives. The
      // witness must never be injected into whatever document loads next (which
      // could replace window.laceCip30Response to ignore the nonce), so the
      // native side drops the pending nonce at load start.
      act(() => {
        result.current.webViewProps.onLoadStart?.('https://other.example');
      });

      responseQueue = [
        { id: 'req-1', success: true, result: 'WITNESS', timestamp: 0 },
      ];
      act(() => {
        rerender();
      });

      expect(inject).not.toHaveBeenCalled();
    });
  });
});
