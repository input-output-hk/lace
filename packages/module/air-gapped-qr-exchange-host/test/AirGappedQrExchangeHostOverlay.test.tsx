/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const VIEW_ID = 'view-1';

const mocks = vi.hoisted(() => ({
  pending: { value: null as unknown },
  viewType: { value: 'tab' as string },
  viewLocation: { value: '/seed-signer-scan' as string | undefined },
  dispatchScanCompleted: vi.fn(),
  dispatchCancelled: vi.fn(),
  dispatchFailed: vi.fn(),
  viewProps: { value: undefined as unknown },
}));

vi.mock('@lace-contract/app', () => ({
  useConfig: () => ({ viewId: VIEW_ID }),
}));

vi.mock('../src/hooks', () => ({
  useLaceSelector: (key: string) => {
    if (key === 'views.selectOpenViewsMap')
      return {
        [VIEW_ID]: {
          id: VIEW_ID,
          type: mocks.viewType.value,
          location: mocks.viewLocation.value,
        },
      };
    return mocks.pending.value;
  },
  useDispatchLaceAction: (key: string) => {
    if (key === 'airGappedQrExchange.scanCompleted')
      return mocks.dispatchScanCompleted;
    if (key === 'airGappedQrExchange.cancelled') return mocks.dispatchCancelled;
    return mocks.dispatchFailed;
  },
}));

vi.mock('@lace-contract/air-gapped-qr-exchange', () => ({
  AIR_GAPPED_QR_SCAN_LOCATION: '/seed-signer-scan',
  bytesToHex: (bytes: Uint8Array): string =>
    Array.from(bytes, b => b.toString(16).padStart(2, '0')).join(''),
}));

vi.mock('../src/AirGappedQrExchangeView', () => ({
  AirGappedQrExchangeView: (props: unknown) => {
    mocks.viewProps.value = props;
    return null;
  },
}));

vi.mock('@lace-lib/ui-toolkit', () => ({
  SheetSafeOverlay: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { AirGappedQrExchangeHostOverlay } from '../src/AirGappedQrExchangeHostOverlay';

type ViewProps = {
  pending: unknown;
  onComplete: (result: { urType: string; cbor: Uint8Array }) => void;
  onCancel: () => void;
  onError: (message: string) => void;
};

const getViewProps = (): ViewProps => mocks.viewProps.value as ViewProps;

describe('AirGappedQrExchangeHostOverlay', () => {
  beforeEach(() => {
    mocks.pending.value = null;
    mocks.viewType.value = 'tab';
    mocks.viewLocation.value = '/seed-signer-scan';
    mocks.viewProps.value = undefined;
    mocks.dispatchScanCompleted.mockClear();
    mocks.dispatchCancelled.mockClear();
    mocks.dispatchFailed.mockClear();
  });

  it('passes the pending exchange through to the view in a tab view', () => {
    mocks.pending.value = { requestId: 'req-1', frames: [] };
    render(<AirGappedQrExchangeHostOverlay />);
    expect(getViewProps().pending).toEqual({ requestId: 'req-1', frames: [] });
  });

  it('renders in the mobile view', () => {
    mocks.viewType.value = 'mobile';
    mocks.pending.value = { requestId: 'req-1', frames: [] };
    render(<AirGappedQrExchangeHostOverlay />);
    expect(getViewProps().pending).toEqual({ requestId: 'req-1', frames: [] });
  });

  it('renders nothing in a tab that is not the scanner tab', () => {
    mocks.viewLocation.value = '/staking';
    mocks.pending.value = { requestId: 'req-1', frames: [] };
    render(<AirGappedQrExchangeHostOverlay />);
    expect(getViewProps()).toBeUndefined();
  });

  it('renders nothing in a popup window view', () => {
    mocks.viewType.value = 'popupWindow';
    mocks.pending.value = { requestId: 'req-1', frames: [] };
    render(<AirGappedQrExchangeHostOverlay />);
    expect(getViewProps()).toBeUndefined();
  });

  it('renders nothing in a side panel view', () => {
    mocks.viewType.value = 'sidePanel';
    mocks.pending.value = { requestId: 'req-1', frames: [] };
    render(<AirGappedQrExchangeHostOverlay />);
    expect(getViewProps()).toBeUndefined();
  });

  it('dispatches scanCompleted with the response cbor as hex', () => {
    mocks.pending.value = { requestId: 'req-2' };
    render(<AirGappedQrExchangeHostOverlay />);

    getViewProps().onComplete({
      urType: 'cardano-sign-response',
      cbor: new Uint8Array([0xb2, 0x05]),
    });

    expect(mocks.dispatchScanCompleted).toHaveBeenCalledWith({
      requestId: 'req-2',
      urType: 'cardano-sign-response',
      cborHex: 'b205',
    });
  });

  it('dispatches cancelled with the request id', () => {
    mocks.pending.value = { requestId: 'req-3' };
    render(<AirGappedQrExchangeHostOverlay />);

    getViewProps().onCancel();

    expect(mocks.dispatchCancelled).toHaveBeenCalledWith({
      requestId: 'req-3',
    });
  });

  it('dispatches failed with the request id and message', () => {
    mocks.pending.value = { requestId: 'req-4' };
    render(<AirGappedQrExchangeHostOverlay />);

    getViewProps().onError('reassembly failed');

    expect(mocks.dispatchFailed).toHaveBeenCalledWith({
      requestId: 'req-4',
      message: 'reassembly failed',
    });
  });

  it('does not dispatch when there is no pending exchange', () => {
    mocks.pending.value = null;
    render(<AirGappedQrExchangeHostOverlay />);

    getViewProps().onComplete({
      urType: 'cardano-sign-response',
      cbor: new Uint8Array([1]),
    });
    getViewProps().onCancel();
    getViewProps().onError('x');

    expect(mocks.dispatchScanCompleted).not.toHaveBeenCalled();
    expect(mocks.dispatchCancelled).not.toHaveBeenCalled();
    expect(mocks.dispatchFailed).not.toHaveBeenCalled();
  });
});
