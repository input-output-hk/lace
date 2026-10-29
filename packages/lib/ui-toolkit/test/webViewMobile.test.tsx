// @vitest-environment jsdom
import { runInNewContext } from 'node:vm';

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { WebViewTemplateMobile } from '../src/design-system/templates/webView/webViewMobile';

import type { WebViewProps } from 'react-native-webview';

const native = vi.hoisted(() => {
  vi.stubGlobal('__DEV__', false);
  return {
    props: {} as WebViewProps,
    injectJavaScript: vi.fn(),
    isIOS: false,
  };
});
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  View: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../src/design-tokens', () => ({
  spacing: { S: 8, L: 24, XL: 32 },
  useTheme: () => ({
    theme: {
      background: { primary: 'white' },
      text: { primary: 'black' },
      brand: { ascending: 'blue' },
    },
  }),
}));
vi.mock('../src/design-system/atoms', () => ({}));
vi.mock('../src/design-system/util/commons', () => ({
  get isIOS() {
    return native.isIOS;
  },
}));
vi.mock('../src/design-system/templates/webView/webViewWeb', () => ({
  WebViewTemplateWeb: () => null,
}));
vi.mock('../src/design-system/templates/webView/nativeBridgeWebView', () => ({
  NativeBridgeWebView: React.forwardRef<unknown, WebViewProps>((props, ref) => {
    native.props = props;
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: native.injectJavaScript,
    }));
    return <div />;
  }),
}));

const event = (url: string, loading: boolean) => ({
  nativeEvent: { url, loading },
});
const loadStart = (url: string) => {
  act(() => {
    native.props.onLoadStart?.(
      event(url, true) as Parameters<
        NonNullable<WebViewProps['onLoadStart']>
      >[0],
    );
  });
};
const loadEnd = (url: string, loading: boolean) => {
  act(() => {
    native.props.onLoadEnd?.(
      event(url, loading) as Parameters<
        NonNullable<WebViewProps['onLoadEnd']>
      >[0],
    );
  });
};

afterEach(() => {
  cleanup();
  native.isIOS = false;
  vi.restoreAllMocks();
  native.injectJavaScript.mockClear();
});
afterAll(() => {
  vi.unstubAllGlobals();
});

describe('mobile WebView debug console forwarding', () => {
  it.each(['https://dapp.example', 'http://localhost:9080'])(
    'includes the sending document origin for %s',
    origin => {
      render(
        <WebViewTemplateMobile
          url="https://launch.example"
          errorMessage="Unavailable"
          debugMode
          injectedJavaScriptBeforeContentLoaded="/* lace-cip30-document-start */"
        />,
      );
      const postMessage = vi.fn<(data: string) => void>();
      const pageConsole = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };
      runInNewContext(native.props.injectedJavaScriptBeforeContentLoaded!, {
        window: { location: { origin }, ReactNativeWebView: { postMessage } },
        console: pageConsole,
      });
      for (const level of ['log', 'warn', 'error', 'info', 'debug'] as const) {
        pageConsole[level]('controlled', { value: 1 });
        expect(JSON.parse(postMessage.mock.calls.at(-1)![0])).toEqual({
          source: 'webview-console',
          origin,
          level,
          message: 'controlled {"value":1}',
        });
      }
      expect(postMessage).toHaveBeenCalledTimes(5);
    },
  );

  it('does not install console forwarding when debugging is disabled', () => {
    const script = '/* lace-cip30-document-start */';
    render(
      <WebViewTemplateMobile
        url="https://dapp.example"
        errorMessage="Unavailable"
        debugMode={false}
        injectedJavaScriptBeforeContentLoaded={script}
      />,
    );
    expect(native.props.injectedJavaScriptBeforeContentLoaded).toBe(script);
  });

  it('consumes debug console messages without passing them to the wallet handler', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const onMessage = vi.fn();
    render(
      <WebViewTemplateMobile
        url="https://dapp.example"
        errorMessage="Unavailable"
        debugMode
        onMessage={onMessage}
      />,
    );
    act(() => {
      native.props.onMessage?.({
        nativeEvent: {
          data: JSON.stringify({
            source: 'webview-console',
            origin: 'https://dapp.example',
            level: 'log',
            message: 'controlled',
          }),
        },
      } as Parameters<NonNullable<WebViewProps['onMessage']>>[0]);
    });
    expect(log).toHaveBeenCalledExactlyOnceWith('[WebView log]', 'controlled');
    expect(onMessage).not.toHaveBeenCalled();
  });
});

describe('mobile WebView load completion', () => {
  it.each([
    'javascript:alert(1)',
    'data:text/html,blocked',
    'file:///blocked.html',
    'intent://blocked',
    'not-a-url',
    '',
  ])('rejects %s without invalidating the live document', url => {
    const onError = vi.fn();
    const onLoadStart = vi.fn();
    const onLoadEnd = vi.fn();
    render(
      <WebViewTemplateMobile
        url="https://live.example"
        errorMessage="Unavailable"
        onError={onError}
        onLoadStart={onLoadStart}
        onLoadEnd={onLoadEnd}
      />,
    );
    loadStart('https://live.example');
    loadEnd('https://live.example', false);
    onLoadStart.mockClear();
    onLoadEnd.mockClear();

    expect(
      native.props.onShouldStartLoadWithRequest?.({ url } as Parameters<
        NonNullable<WebViewProps['onShouldStartLoadWithRequest']>
      >[0]),
    ).toBe(false);
    expect(onError).not.toHaveBeenCalled();
    expect(onLoadStart).not.toHaveBeenCalled();
    expect(onLoadEnd).not.toHaveBeenCalled();
  });

  it.each(['https://allowed.example', 'http://localhost:9080', 'about:blank'])(
    'preserves the navigation callback allowlist for %s',
    url => {
      const onError = vi.fn();
      render(
        <WebViewTemplateMobile
          url="https://live.example"
          errorMessage="Unavailable"
          onError={onError}
        />,
      );
      expect(
        native.props.onShouldStartLoadWithRequest?.({ url } as Parameters<
          NonNullable<WebViewProps['onShouldStartLoadWithRequest']>
        >[0]),
      ).toBe(true);
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'forwards the completed destination even when loading is %s',
    loading => {
      const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
      const onLoadStart = vi.fn();
      const onLoadEnd = vi.fn();
      render(
        <WebViewTemplateMobile
          url="https://first.example"
          errorMessage="Unavailable"
          onLoadStart={onLoadStart}
          onLoadEnd={onLoadEnd}
        />,
      );
      loadStart('https://destination.example');
      now.mockReturnValue(1250);
      loadEnd('https://redirected.example/app', loading);
      expect(onLoadStart).toHaveBeenCalledWith('https://destination.example');
      expect(onLoadEnd).toHaveBeenCalledExactlyOnceWith(
        'https://redirected.example/app',
        250,
      );
    },
  );

  it('does not report a destination when the completion URL is empty', () => {
    const onLoadEnd = vi.fn();
    render(
      <WebViewTemplateMobile
        url="https://first.example"
        errorMessage="Unavailable"
        onLoadEnd={onLoadEnd}
      />,
    );
    loadStart('https://destination.example');
    loadEnd('', false);
    expect(onLoadEnd).not.toHaveBeenCalled();
  });

  it('forwards errors before load completion so consumers can retain their failure state', () => {
    const onError = vi.fn();
    const onLoadEnd = vi.fn();
    render(
      <WebViewTemplateMobile
        url="https://first.example"
        errorMessage="Unavailable"
        onError={onError}
        onLoadEnd={onLoadEnd}
      />,
    );
    loadStart('https://failed.example');
    act(() => {
      native.props.onError?.({
        nativeEvent: {
          url: 'https://failed.example',
          loading: true,
          code: -2,
          description: 'Failed',
          domain: 'test',
        },
      } as Parameters<NonNullable<WebViewProps['onError']>>[0]);
    });
    loadEnd('https://failed.example', true);
    expect(onError).toHaveBeenCalledExactlyOnceWith({
      url: 'https://failed.example',
      code: -2,
      description: 'Failed',
      domain: 'test',
    });
    expect(onLoadEnd).toHaveBeenCalledExactlyOnceWith(
      'https://failed.example',
      expect.any(Number),
    );
    expect(onError.mock.invocationCallOrder[0]).toBeLessThan(
      onLoadEnd.mock.invocationCallOrder[0],
    );
  });

  it('preserves the iOS blank-page recovery before reporting the real destination', () => {
    native.isIOS = true;
    const onLoadEnd = vi.fn();
    render(
      <WebViewTemplateMobile
        url="https://first.example"
        errorMessage="Unavailable"
        onLoadEnd={onLoadEnd}
      />,
    );
    loadEnd('about:blank', true);
    expect(onLoadEnd).not.toHaveBeenCalled();
    expect(native.injectJavaScript).toHaveBeenCalledExactlyOnceWith(
      'window.location.replace("https://first.example"); true;',
    );
    loadStart('https://first.example');
    loadEnd('https://first.example', true);
    expect(onLoadEnd).toHaveBeenCalledExactlyOnceWith(
      'https://first.example',
      expect.any(Number),
    );
  });
});
