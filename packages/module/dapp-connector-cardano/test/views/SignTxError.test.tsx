/** @vitest-environment jsdom */
import {
  fireEvent,
  render,
  renderHook,
  screen,
  cleanup,
} from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SignTxError,
  SignTxErrorBox,
} from '../../src/common/components/SignTxError';
import { useDappSignRequest } from '../../src/mobile/hooks/useDappSignRequest';

const { copyToClipboard } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('@lace-contract/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@lace-lib/navigation', () => ({
  NavigationControls: { closeSheet: vi.fn() },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  Column: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Text: {
    M: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
    S: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  },
  Icon: () => null,
  spacing: { L: 16, M: 12, S: 8 },
  useTheme: () => ({
    theme: { background: { secondary: '#eee' }, border: { middle: '#aaa' } },
  }),
  useCopyToClipboard: ({ onSuccess }: { onSuccess: () => void }) => ({
    copyToClipboard: (text: string) => {
      copyToClipboard(text);
      onSuccess();
    },
  }),
}));

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  TouchableOpacity: ({
    children,
    onPress,
    accessibilityLabel,
  }: React.PropsWithChildren<{
    onPress: () => void;
    accessibilityLabel: string;
  }>) => (
    <button onClick={onPress} aria-label={accessibilityLabel}>
      {children}
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SignTxError', () => {
  it('copies a mobile preparation failure with its numeric protocol code and redacted origin', () => {
    const { result } = renderHook(() =>
      useDappSignRequest({
        signingType: 'signTx',
        requestId: 'request',
        pendingRequest: {},
        webViewResponseQueue: [
          {
            id: 'request',
            success: false,
            timestamp: 0,
            error: {
              code: -4,
              info: 'Account not found for origin: https://alice.example.com',
            },
          },
        ],
        dispatchConfirm: vi.fn(),
        dispatchReject: vi.fn(),
        dispatchClearPendingRequest: vi.fn(),
        dispatchClearWebViewResponse: vi.fn(),
      }),
    );
    const expected = {
      stage: 'signing preparation',
      name: 'APIError',
      message: 'Account not found for origin: [redacted]',
      code: -4,
    };
    expect(result.current.result?.error?.diagnostics).toEqual(expected);
    render(
      <SignTxErrorBox error={result.current.result?.error?.diagnostics} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'v2.generic.btn.copy' }),
    );
    expect(copyToClipboard).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify(expected, null, 2),
    );
  });
  it.each([
    ['No transaction data provided', 'No transaction data provided'],
    ['Unexpected end of buffer', 'Unexpected end of buffer'],
    [
      'Definite length exceeds buffer size',
      'Definite length exceeds buffer size',
    ],
    ['Failed to parse transaction', 'Failed to parse transaction'],
    [
      'Alice alice@example.com addr_test1private https://dapp.example/?secret=123',
      '[Unrecognised message omitted for privacy]',
    ],
    [
      'Unexpected end of buffer: alice@example.com',
      '[Unrecognised message omitted for privacy]',
    ],
    [undefined, '[Unrecognised message omitted for privacy]'],
    [null, '[Unrecognised message omitted for privacy]'],
    ['', '[Unrecognised message omitted for privacy]'],
  ])('copies only safe diagnostics for %s', (error, message) => {
    const { container } = render(<SignTxError error={error} />);
    const expected = JSON.stringify(
      {
        stage: 'transaction inspection',
        name: 'Error',
        message,
      },
      null,
      2,
    );

    expect(container.textContent).toContain(expected);
    fireEvent.click(
      screen.getByRole('button', { name: 'v2.generic.btn.copy' }),
    );
    expect(copyToClipboard).toHaveBeenCalledExactlyOnceWith(expected);
    expect(screen.getByText('app.copied-to-clipboard')).toBeTruthy();
    expect(container.textContent).not.toContain('alice@example.com');
  });
});
