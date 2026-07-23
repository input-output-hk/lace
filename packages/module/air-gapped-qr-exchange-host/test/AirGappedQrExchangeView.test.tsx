/**
 * @vitest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  animatedQrFrames: { value: undefined as unknown },
  scannerRendered: { value: false },
  onComplete: {
    value: undefined as ((result: unknown) => boolean | undefined) | undefined,
  },
  onContinue: { value: undefined as (() => void) | undefined },
}));

vi.mock('@lace-contract/i18n', async importOriginal => ({
  ...(await importOriginal<object>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  spacing: { L: 0, M: 0, XS: 0 },
  useTheme: () => ({
    theme: { background: { page: '#000' }, data: { negative: '#f00' } },
  }),
  AnimatedQrCode: (props: { frames: unknown }) => {
    mocks.animatedQrFrames.value = props.frames;
    return null;
  },
  UrScanner: (props: {
    onComplete: (result: unknown) => boolean | undefined;
  }) => {
    mocks.scannerRendered.value = true;
    mocks.onComplete.value = props.onComplete;
    return null;
  },
  Button: {
    Primary: (props: { onPress: () => void }) => {
      mocks.onContinue.value = props.onPress;
      return null;
    },
  },
  Text: {
    Header: () => null,
    M: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => <span data-testid={testID}>{children}</span>,
  },
}));

vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: unknown) => styles,
    absoluteFillObject: {},
  },
  View: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import { AirGappedQrExchangeView } from '../src/AirGappedQrExchangeView';

import type { PendingAirGappedQrExchange } from '@lace-contract/air-gapped-qr-exchange';

const pending = (
  overrides: Partial<PendingAirGappedQrExchange> = {},
): PendingAirGappedQrExchange =>
  ({
    requestId: 'req-1',
    expectedResponseType: 'crypto-hdkey',
    frames: [],
    fps: 8,
    ...overrides,
  } as PendingAirGappedQrExchange);

const renderOverlay = (
  value: PendingAirGappedQrExchange | null,
  onComplete: (result: unknown) => void = vi.fn(),
  onError: (message: string) => void = vi.fn(),
) =>
  render(
    <AirGappedQrExchangeView
      pending={value}
      onComplete={onComplete}
      onCancel={vi.fn()}
      onError={onError}
    />,
  );

describe('AirGappedQrExchangeView phase init', () => {
  beforeEach(() => {
    mocks.animatedQrFrames.value = undefined;
    mocks.scannerRendered.value = false;
    mocks.onComplete.value = undefined;
  });

  it('starts in the scan phase for a scan-only exchange (no request frames)', () => {
    renderOverlay(pending({ frames: [] }));

    expect(mocks.scannerRendered.value).toBe(true);
    expect(mocks.animatedQrFrames.value).toBeUndefined();
  });

  it('starts in the request phase when request frames are present', () => {
    renderOverlay(pending({ frames: ['ur:a', 'ur:b'] }));

    expect(mocks.animatedQrFrames.value).toEqual(['ur:a', 'ur:b']);
    expect(mocks.scannerRendered.value).toBe(false);
  });

  it('renders nothing while idle', () => {
    const { container } = renderOverlay(null);

    expect(container.firstChild).toBeNull();
    expect(mocks.animatedQrFrames.value).toBeUndefined();
    expect(mocks.scannerRendered.value).toBe(false);
  });
});

describe('AirGappedQrExchangeView detail line', () => {
  const DETAIL_TEST_ID = 'air-gapped-qr-exchange-detail';

  it('renders the detail line in the request phase', () => {
    const { queryByTestId } = renderOverlay(
      pending({ frames: ['ur:a'], detail: 'deadbeef' }),
    );

    expect(queryByTestId(DETAIL_TEST_ID)?.textContent).toBe('deadbeef');
  });

  it('omits the detail line when the pending exchange has none', () => {
    const { queryByTestId } = renderOverlay(pending({ frames: ['ur:a'] }));

    expect(queryByTestId(DETAIL_TEST_ID)).toBeNull();
  });

  it('does not render the detail line in the scan phase', () => {
    const { queryByTestId } = renderOverlay(
      pending({ frames: [], detail: 'deadbeef' }),
    );

    expect(queryByTestId(DETAIL_TEST_ID)).toBeNull();
  });
});

describe('AirGappedQrExchangeView instruction copy', () => {
  const INSTRUCTION_TEST_ID = 'air-gapped-qr-exchange-instruction';

  beforeEach(() => {
    mocks.onContinue.value = undefined;
  });

  it('shows the request-phase instruction, then the default scan instruction after Continue', () => {
    const { queryByTestId } = renderOverlay(
      pending({
        frames: ['ur:a'],
        requestInstructionKey:
          'v2.air-gapped-qr-exchange.blind-signing.instruction',
      }),
    );

    expect(queryByTestId(INSTRUCTION_TEST_ID)?.textContent).toBe(
      'v2.air-gapped-qr-exchange.blind-signing.instruction',
    );

    act(() => {
      mocks.onContinue.value?.();
    });

    expect(queryByTestId(INSTRUCTION_TEST_ID)?.textContent).toBe(
      'v2.air-gapped-qr-exchange.scan.instruction',
    );
  });

  it('shows the custom instruction during the scan phase of a scan-only exchange', () => {
    const { queryByTestId } = renderOverlay(
      pending({
        frames: [],
        instructionKey: 'v2.keystone-bitcoin.import.instruction',
      }),
    );

    expect(queryByTestId(INSTRUCTION_TEST_ID)?.textContent).toBe(
      'v2.keystone-bitcoin.import.instruction',
    );
  });
});

describe('AirGappedQrExchangeView handleComplete gate', () => {
  beforeEach(() => {
    mocks.animatedQrFrames.value = undefined;
    mocks.scannerRendered.value = false;
    mocks.onComplete.value = undefined;
  });

  const complete = (result: { urType: string; cbor: Uint8Array }) => {
    let didAccept: boolean | undefined;
    act(() => {
      didAccept = mocks.onComplete.value?.(result);
    });
    return didAccept;
  };

  const WRONG_TYPE_HINT_TEST_ID = 'air-gapped-qr-exchange-wrong-type-hint';

  it('completes for a single-string expectedResponseType match', () => {
    const onComplete = vi.fn();
    renderOverlay(
      pending({ expectedResponseType: 'crypto-hdkey' }),
      onComplete,
    );

    const result = { urType: 'crypto-hdkey', cbor: new Uint8Array([1]) };
    const didAccept = complete(result);

    expect(onComplete).toHaveBeenCalledWith(result);
    expect(didAccept).toBe(true);
  });

  it('completes for a member of an array expectedResponseType', () => {
    const onComplete = vi.fn();
    renderOverlay(
      pending({ expectedResponseType: ['crypto-hdkey', 'crypto-account'] }),
      onComplete,
    );

    const result = { urType: 'crypto-account', cbor: new Uint8Array([2]) };
    complete(result);

    expect(onComplete).toHaveBeenCalledWith(result);
  });

  it('rejects a type in neither member of an array expectedResponseType so scanning resumes', () => {
    const onComplete = vi.fn();
    renderOverlay(
      pending({ expectedResponseType: ['crypto-hdkey', 'crypto-account'] }),
      onComplete,
    );

    const didAccept = complete({
      urType: 'crypto-psbt',
      cbor: new Uint8Array([3]),
    });

    expect(didAccept).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows the wrong-QR-type hint on a rejected scan without failing the exchange', () => {
    const onComplete = vi.fn();
    const onError = vi.fn();
    const { queryByTestId } = renderOverlay(
      pending({ expectedResponseType: 'crypto-hdkey' }),
      onComplete,
      onError,
    );

    expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)).toBeNull();

    complete({ urType: 'crypto-psbt', cbor: new Uint8Array([3]) });

    expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)).not.toBeNull();
    expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)?.textContent).toBe(
      'v2.air-gapped-qr-exchange.scan.wrong-qr-type',
    );
    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('completes a matching scan after a rejected wrong-type scan and hides the hint', () => {
    const onComplete = vi.fn();
    const { queryByTestId } = renderOverlay(
      pending({ expectedResponseType: 'crypto-hdkey' }),
      onComplete,
    );

    complete({ urType: 'crypto-psbt', cbor: new Uint8Array([3]) });
    expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)).not.toBeNull();

    const result = { urType: 'crypto-hdkey', cbor: new Uint8Array([1]) };
    const didAccept = complete(result);

    expect(didAccept).toBe(true);
    expect(onComplete).toHaveBeenCalledWith(result);
    expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)).toBeNull();
  });

  it('hides the wrong-QR-type hint automatically after a timeout', () => {
    vi.useFakeTimers();
    try {
      const { queryByTestId } = renderOverlay(
        pending({ expectedResponseType: 'crypto-hdkey' }),
      );

      complete({ urType: 'crypto-psbt', cbor: new Uint8Array([3]) });
      expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      expect(queryByTestId(WRONG_TYPE_HINT_TEST_ID)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
