import React from 'react';

import { AirGappedQrExchangeHostOverlay } from '../AirGappedQrExchangeHostOverlay';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

/**
 * Mounts the redux-state-driven QR exchange overlay on all platforms. On
 * mobile the single JS context means the side effect's pending state is read
 * here directly and the native camera (expo-camera) handles both the request
 * and scan phases in place. In extension views the overlay renders the camera
 * only in the 'tab' view the SW side effect opens (getUserMedia cannot run in
 * the popup/side panel under MV3); other views render nothing.
 */
const loadGlobalOverlays: ContextualLaceInit<
  React.ReactNode,
  AvailableAddons
> = () => (
  <AirGappedQrExchangeHostOverlay key="air-gapped-qr-exchange-overlay" />
);

export default loadGlobalOverlays;
