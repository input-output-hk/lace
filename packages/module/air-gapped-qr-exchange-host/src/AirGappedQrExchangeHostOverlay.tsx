import { AIR_GAPPED_QR_SCAN_LOCATION } from '@lace-contract/air-gapped-qr-exchange';
import { useConfig } from '@lace-contract/app';
import { SheetSafeOverlay } from '@lace-lib/ui-toolkit';
import { HexBytes } from '@lace-lib/util';
import React, { useCallback } from 'react';

import { AirGappedQrExchangeView } from './AirGappedQrExchangeView';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

import type { UrResult } from '@lace-lib/ur-transport';

/**
 * Redux-state-driven host for the air-gapped QR exchange. Reads the pending
 * exchange the SW side effect wrote (the SW<->view crossing) and renders the
 * shared QR display + scanner; on a terminal user action it dispatches the
 * matching result action, which the SW side effect awaits to resolve the
 * trigger Observable. The device-response CBOR crosses redux as hex (ADR-08).
 *
 * Mounted globally via loadGlobalOverlays. It renders only in a camera-capable
 * view -- the scanner tab the SW side effect opens on the extension (matched by
 * its connected-view location) or the single 'mobile' view -- never in other
 * tabs or the popup/side panel, where getUserMedia is blocked
 * under MV3 and would show a spurious "camera denied" screen. The current view
 * type comes from the views store (the same mechanism App.tsx uses to branch).
 */
export const AirGappedQrExchangeHostOverlay = () => {
  const { viewId } = useConfig();
  const openViews = useLaceSelector('views.selectOpenViewsMap');
  const viewType = openViews[viewId]?.type;

  const pending = useLaceSelector('airGappedQrExchange.selectPending');
  const dispatchScanCompleted = useDispatchLaceAction(
    'airGappedQrExchange.scanCompleted',
  );
  const dispatchCancelled = useDispatchLaceAction(
    'airGappedQrExchange.cancelled',
  );
  const dispatchFailed = useDispatchLaceAction('airGappedQrExchange.failed');

  const requestId = pending?.requestId;

  const onComplete = useCallback(
    (result: UrResult) => {
      if (!requestId) return;
      dispatchScanCompleted({
        requestId,
        urType: result.urType,
        cborHex: HexBytes.fromByteArray(result.cbor),
      });
    },
    [dispatchScanCompleted, requestId],
  );

  const onCancel = useCallback(() => {
    if (!requestId) return;
    dispatchCancelled({ requestId });
  }, [dispatchCancelled, requestId]);

  const onError = useCallback(
    (message: string) => {
      if (!requestId) return;
      dispatchFailed({ requestId, message });
    },
    [dispatchFailed, requestId],
  );

  const isScannerTab =
    viewType === 'tab' &&
    openViews[viewId]?.location === AIR_GAPPED_QR_SCAN_LOCATION;
  const isCameraCapableView = isScannerTab || viewType === 'mobile';
  if (!isCameraCapableView) return null;

  const overlay = (
    <AirGappedQrExchangeView
      pending={pending}
      onComplete={onComplete}
      onCancel={onCancel}
      onError={onError}
    />
  );

  // On mobile the exchange must sit above any presented sheet, so wrap it in a
  // sheet-safe full-window overlay. The extension renders it in a dedicated tab
  // where nothing can cover it, so it stays unwrapped there.
  if (viewType === 'mobile') {
    return (
      <SheetSafeOverlay visible={!!pending} onRequestClose={onCancel}>
        {overlay}
      </SheetSafeOverlay>
    );
  }

  return overlay;
};
