// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NativeBridgeWebView } from '../src/design-system/templates/webView/nativeBridgeWebView';

import type { WebViewTemplateProps } from '../src/design-system/templates/webView/webView';

type NativeProps = {
  laceBridgeStatusRequestId?: string;
  onLaceBridgeStatus: (event: {
    nativeEvent: {
      requestId?: string;
      documentStartScript?: boolean;
      webMessageListener?: boolean;
    };
  }) => void;
  onMessage: (event: { nativeEvent: { data: string } }) => void;
};
const native = vi.hoisted(() => ({ props: {} as NativeProps, os: 'android' }));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return native.os;
    },
  },
  View: ({
    children,
    testID,
  }: React.PropsWithChildren<{ testID?: string }>) => (
    <div data-testid={testID}>{children}</div>
  ),
}));
vi.mock('react-native-webview', () => ({
  WebView: React.forwardRef<unknown, NativeProps>((_props, _ref) => {
    native.props = _props;
    return <div data-testid="webpage" />;
  }),
}));
vi.mock('../src/design-tokens', () => ({
  spacing: { S: 8, XS: 4 },
  useTheme: () => ({ theme: { background: { secondary: 'white' } } }),
}));
vi.mock('../src/design-system/atoms', () => ({
  Text: {
    S: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  },
}));

const notice = {
  title: 'Wallet connection unavailable',
  body: 'You can still browse.',
};
const marked = '/* lace-cip30-document-start */';
const view = (
  key = 'first',
  script = marked,
  onBridgeCompatibilityClassified?: WebViewTemplateProps['onBridgeCompatibilityClassified'],
) => (
  <NativeBridgeWebView
    key={key}
    bridgeUnavailableNotice={notice}
    injectedJavaScriptBeforeContentLoaded={script}
    onBridgeCompatibilityClassified={onBridgeCompatibilityClassified}
  />
);
const reply = (
  documentStartScript: boolean,
  webMessageListener: boolean,
  requestId = native.props.laceBridgeStatusRequestId,
) => {
  act(() => {
    native.props.onLaceBridgeStatus({
      nativeEvent: { requestId, documentStartScript, webMessageListener },
    });
  });
};
afterEach(() => {
  cleanup();
  native.os = 'android';
});

describe('native capability notice', () => {
  it.each([
    [false, true],
    [true, false],
    [false, false],
  ])(
    'shows confirmed unsupported (%s, %s) while keeping the page mounted',
    (documentStart, listener) => {
      render(view());
      expect(screen.queryByText(notice.title)).toBeNull();
      const page = screen.getByTestId('webpage');
      reply(documentStart, listener);
      expect(screen.getByText(notice.title)).toBeTruthy();
      expect(screen.getByTestId('webpage')).toBe(page);
    },
  );
  it('does not label pending, malformed or supported results unsupported', () => {
    render(view());
    expect(screen.queryByText(notice.title)).toBeNull();
    act(() => {
      native.props.onLaceBridgeStatus({
        nativeEvent: { requestId: native.props.laceBridgeStatusRequestId },
      });
    });
    expect(screen.queryByText(notice.title)).toBeNull();
    reply(true, true);
    expect(screen.queryByText(notice.title)).toBeNull();
  });
  it('does not consume page messages as status, even with the current request ID', () => {
    const onMessage = vi.fn();
    render(
      <NativeBridgeWebView
        bridgeUnavailableNotice={notice}
        injectedJavaScriptBeforeContentLoaded={marked}
        onMessage={onMessage}
      />,
    );
    const message = {
      nativeEvent: {
        data: JSON.stringify({
          requestId: native.props.laceBridgeStatusRequestId,
          documentStartScript: false,
          webMessageListener: false,
        }),
      },
    };
    act(() => {
      native.props.onMessage(message);
    });
    expect(onMessage).toHaveBeenCalledWith(message);
    expect(screen.queryByText(notice.title)).toBeNull();
    reply(false, true);
    act(() => {
      native.props.onMessage({
        nativeEvent: {
          data: '{"documentStartScript":true,"webMessageListener":true}',
        },
      });
    });
    expect(screen.getByText(notice.title)).toBeTruthy();
  });
  it('keeps status across navigation and resets on remount, rejecting stale callbacks', () => {
    const mounted = render(view());
    const old = { ...native.props };
    reply(false, true);
    mounted.rerender(view());
    expect(screen.getByText(notice.title)).toBeTruthy();
    mounted.rerender(view('replacement'));
    expect(screen.queryByText(notice.title)).toBeNull();
    act(() => {
      old.onLaceBridgeStatus({
        nativeEvent: {
          requestId: old.laceBridgeStatusRequestId,
          documentStartScript: false,
          webMessageListener: false,
        },
      });
    });
    reply(false, false, old.laceBridgeStatusRequestId);
    expect(screen.queryByText(notice.title)).toBeNull();
    reply(true, true);
    mounted.unmount();
    act(() => {
      old.onLaceBridgeStatus({
        nativeEvent: {
          requestId: old.laceBridgeStatusRequestId,
          documentStartScript: false,
          webMessageListener: false,
        },
      });
    });
  });
  it('requests fresh status when the protected script changes', () => {
    const mounted = render(view());
    const oldId = native.props.laceBridgeStatusRequestId;
    reply(false, true);
    mounted.rerender(view('first', `${marked}changed`));
    expect(native.props.laceBridgeStatusRequestId).not.toBe(oldId);
    expect(screen.queryByText(notice.title)).toBeNull();
    reply(false, false, oldId);
    expect(screen.queryByText(notice.title)).toBeNull();
  });
  it('does not opt ordinary WebViews or iOS into reporting', () => {
    const mounted = render(<NativeBridgeWebView />);
    expect(native.props.onLaceBridgeStatus).toBeUndefined();
    native.os = 'ios';
    mounted.rerender(view());
    expect(native.props.onLaceBridgeStatus).toBeUndefined();
  });
  it('requests status when the notice consumer attaches after the WebView has mounted', () => {
    const mounted = render(
      <NativeBridgeWebView injectedJavaScriptBeforeContentLoaded={marked} />,
    );
    expect(native.props.laceBridgeStatusRequestId).toBeUndefined();
    mounted.rerender(
      <NativeBridgeWebView
        injectedJavaScriptBeforeContentLoaded={marked}
        bridgeUnavailableNotice={notice}
      />,
    );
    expect(native.props.laceBridgeStatusRequestId).toBeTruthy();
    reply(false, true);
    expect(screen.getByText(notice.title)).toBeTruthy();
  });
});

describe('native compatibility observation', () => {
  it.each([
    [true, true, 'supported'],
    [false, true, 'missing_document_start_script'],
    [true, false, 'missing_web_message_listener'],
    [false, false, 'missing_both'],
  ] as const)(
    'classifies (%s, %s) as %s with no native data',
    (start, listener, outcome) => {
      const report = vi.fn();
      render(view('first', marked, report));
      act(() => {
        native.props.onLaceBridgeStatus({
          nativeEvent: {
            requestId: native.props.laceBridgeStatusRequestId,
            documentStartScript: start,
            webMessageListener: listener,
            url: 'https://sensitive.example/history',
            origin: 'https://sensitive.example',
            replyKey: 'sensitive-key',
            nonce: 'sensitive-nonce',
            token: 'sensitive-capability',
            account: 'sensitive-account',
            body: { request: 'sensitive-request', reply: 'sensitive-reply' },
          } as Parameters<NativeProps['onLaceBridgeStatus']>[0]['nativeEvent'],
        });
      });
      expect(report).toHaveBeenCalledExactlyOnceWith(outcome);
      expect(screen.queryByText(notice.title) !== null).toBe(
        outcome !== 'supported',
      );
    },
  );

  it('excludes pending, malformed, stale and page results without consuming the classification', () => {
    const report = vi.fn();
    const pageMessage = vi.fn();
    render(
      <NativeBridgeWebView
        bridgeUnavailableNotice={notice}
        injectedJavaScriptBeforeContentLoaded={marked}
        onBridgeCompatibilityClassified={report}
        onMessage={pageMessage}
      />,
    );
    expect(report).not.toHaveBeenCalled();
    reply(false, false, 'stale-id');
    act(() => {
      for (const malformed of [
        {},
        { documentStartScript: false },
        { documentStartScript: 'false', webMessageListener: true },
      ]) {
        native.props.onLaceBridgeStatus({
          nativeEvent: {
            requestId: native.props.laceBridgeStatusRequestId,
            ...malformed,
          } as Parameters<NativeProps['onLaceBridgeStatus']>[0]['nativeEvent'],
        });
      }
      native.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            requestId: native.props.laceBridgeStatusRequestId,
            documentStartScript: false,
            webMessageListener: false,
          }),
        },
      });
    });
    expect(report).not.toHaveBeenCalled();
    expect(screen.queryByText(notice.title)).toBeNull();
    reply(true, true);
    expect(report).toHaveBeenCalledExactlyOnceWith('supported');
  });

  it('bounds attempts across repeats, rerenders, navigation, script changes and callback replacement; remount starts a new unit', () => {
    const report = vi.fn();
    const replacementReport = vi.fn();
    const mounted = render(view('first', marked, report));
    const old = { ...native.props };
    reply(false, true);
    reply(false, true);
    mounted.rerender(view('first', marked, report));
    reply(false, true);
    mounted.rerender(view('first', `${marked}changed`, replacementReport));
    reply(false, false, old.laceBridgeStatusRequestId);
    reply(true, true);
    expect(report).toHaveBeenCalledExactlyOnceWith(
      'missing_document_start_script',
    );
    expect(replacementReport).not.toHaveBeenCalled();
    mounted.rerender(view('replacement', marked, replacementReport));
    act(() => {
      old.onLaceBridgeStatus({
        nativeEvent: {
          requestId: old.laceBridgeStatusRequestId,
          documentStartScript: false,
          webMessageListener: false,
        },
      });
    });
    reply(false, false, old.laceBridgeStatusRequestId);
    expect(replacementReport).not.toHaveBeenCalled();
    reply(true, false);
    expect(replacementReport).toHaveBeenCalledExactlyOnceWith(
      'missing_web_message_listener',
    );
    mounted.unmount();
    act(() => {
      old.onLaceBridgeStatus({
        nativeEvent: {
          requestId: old.laceBridgeStatusRequestId,
          documentStartScript: true,
          webMessageListener: true,
        },
      });
    });
    expect(report).toHaveBeenCalledTimes(1);
  });

  it.each(['throw', 'reject'] as const)(
    'contains a reporting %s without changing notice, browsing or the attempt bound',
    async failure => {
      const report = vi.fn<() => unknown>();
      if (failure === 'throw') {
        report.mockImplementation(() => {
          throw new Error('sensitive-reporting-error');
        });
      } else {
        report.mockReturnValue(
          Promise.reject(new Error('sensitive-reporting-error')),
        );
      }
      render(view('first', marked, report));
      const page = screen.getByTestId('webpage');
      reply(false, true);
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText(notice.title)).toBeTruthy();
      expect(screen.getByTestId('webpage')).toBe(page);
      reply(false, true);
      reply(true, true);
      expect(screen.queryByText(notice.title)).toBeNull();
      expect(report).toHaveBeenCalledExactlyOnceWith(
        'missing_document_start_script',
      );
    },
  );

  it('excludes iOS and ordinary WebViews even with a measurement consumer', () => {
    const report = vi.fn();
    const mounted = render(
      <NativeBridgeWebView onBridgeCompatibilityClassified={report} />,
    );
    expect(native.props.onLaceBridgeStatus).toBeUndefined();
    native.os = 'ios';
    mounted.rerender(view('first', marked, report));
    expect(native.props.onLaceBridgeStatus).toBeUndefined();
    expect(report).not.toHaveBeenCalled();
  });
});
