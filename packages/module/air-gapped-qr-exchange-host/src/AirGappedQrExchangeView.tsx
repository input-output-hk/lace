import {
  matchesExpectedResponseType,
  resolveExchangeLabelKeys,
} from '@lace-contract/air-gapped-qr-exchange';
import { useTranslation } from '@lace-contract/i18n';
import {
  AnimatedQrCode,
  Button,
  spacing,
  Text,
  UrScanner,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  AirGappedQrExchangePhase,
  PendingAirGappedQrExchange,
} from '@lace-contract/air-gapped-qr-exchange';
import type { Theme } from '@lace-lib/ui-toolkit';
import type { UrResult } from '@lace-lib/ur-transport';

/**
 * The initial phase for an exchange. A scan-only exchange (no request frames,
 * e.g. the Bitcoin import-xpub flow) has nothing to display, so it starts
 * directly in the 'scan' phase; otherwise it starts in the 'request' phase
 * (request QR -> Continue -> scan).
 */
const initialPhaseFor = (
  pending: Pick<PendingAirGappedQrExchange, 'frames'> | null,
): AirGappedQrExchangePhase =>
  pending && pending.frames.length === 0 ? 'scan' : 'request';

/** How long the wrong-QR-type hint stays visible after a rejected scan. */
const WRONG_TYPE_HINT_MS = 4000;

export interface AirGappedQrExchangeViewProps {
  /** The pending exchange from redux state, or null when idle. */
  pending: PendingAirGappedQrExchange | null;
  /** Called with the reassembled device response on a matching scan. */
  onComplete: (result: UrResult) => void;
  /** Called when the user cancels the exchange. */
  onCancel: () => void;
  /** Called with a scanning/reassembly error message. */
  onError: (message: string) => void;
}

/**
 * Presentational air-gapped QR exchange surface, driven by redux pending state
 * (the SW<->view crossing) rather than an in-memory hook. Shows the request as
 * an animated QR (request phase), then scans the device response (scan phase).
 * The host wires `pending` from a selector and the callbacks to result
 * actions; renders nothing while idle. Works on both platforms: UrScanner
 * resolves to the native camera on mobile and the bundled jsQR/getUserMedia path
 * (tab) on the extension. UrScanner is navigation-free so it can mount as a
 * free-standing overlay (UrScannerSheet requires a navigation screen).
 */
export const AirGappedQrExchangeView = ({
  pending,
  onComplete,
  onCancel,
  onError,
}: AirGappedQrExchangeViewProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [phase, setPhase] = useState<AirGappedQrExchangePhase>(() =>
    initialPhaseFor(pending),
  );

  const [isWrongTypeHintVisible, setIsWrongTypeHintVisible] = useState(false);

  // Reset the phase per exchange: the overlay stays mounted between requests,
  // so a prior phase would otherwise carry over. Scan-only exchanges (no
  // request frames) skip the request phase, which has nothing to display.
  const requestId = pending?.requestId;
  const hasRequestFrames = (pending?.frames.length ?? 0) > 0;
  useEffect(() => {
    setPhase(hasRequestFrames ? 'request' : 'scan');
    setIsWrongTypeHintVisible(false);
  }, [requestId, hasRequestFrames]);

  useEffect(() => {
    if (!isWrongTypeHintVisible) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setIsWrongTypeHintVisible(false);
    }, WRONG_TYPE_HINT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isWrongTypeHintVisible]);

  const startScanning = useCallback(() => {
    setPhase('scan');
  }, []);

  const handleComplete = useCallback(
    (result: UrResult): boolean => {
      if (
        !pending ||
        !matchesExpectedResponseType(
          pending.expectedResponseType,
          result.urType,
        )
      ) {
        setIsWrongTypeHintVisible(true);
        return false;
      }
      setIsWrongTypeHintVisible(false);
      onComplete(result);
      return true;
    },
    [onComplete, pending],
  );

  const handleError = useCallback(
    (message: string) => {
      onError(message);
    },
    [onError],
  );

  if (!pending) {
    return null;
  }

  const styles = getStyles(theme);
  const { titleKey, instructionKey } = resolveExchangeLabelKeys(pending, phase);

  const heading = (
    <View style={styles.heading}>
      <Text.Header testID="air-gapped-qr-exchange-title">
        {t(titleKey)}
      </Text.Header>
      <Text.M testID="air-gapped-qr-exchange-instruction">
        {t(instructionKey)}
      </Text.M>
    </View>
  );

  return (
    <View style={styles.overlay}>
      {phase === 'request' ? (
        <View style={styles.content}>
          {heading}
          {pending.detail ? (
            <Text.M
              selectable
              style={styles.detail}
              testID="air-gapped-qr-exchange-detail">
              {pending.detail}
            </Text.M>
          ) : null}
          <AnimatedQrCode
            frames={pending.frames}
            fps={pending.fps}
            chainType={pending.chainType ?? 'Cardano'}
          />
          <Button.Primary
            label={t('v2.air-gapped-qr-exchange.request.continue')}
            onPress={startScanning}
            testID="air-gapped-qr-exchange-continue-button"
          />
        </View>
      ) : (
        <View style={styles.scanner}>
          {heading}
          {isWrongTypeHintVisible ? (
            <Text.M
              style={styles.wrongTypeHint}
              testID="air-gapped-qr-exchange-wrong-type-hint">
              {t('v2.air-gapped-qr-exchange.scan.wrong-qr-type')}
            </Text.M>
          ) : null}
          <View style={styles.scannerCamera}>
            <UrScanner
              key={pending.requestId}
              theme={theme}
              onComplete={handleComplete}
              onCancel={onCancel}
              onError={handleError}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.background.page,
      zIndex: 1000,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.L,
    },
    content: {
      alignItems: 'center',
      gap: spacing.M,
    },
    heading: {
      alignItems: 'center',
      gap: spacing.XS,
    },
    scanner: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.M,
    },
    scannerCamera: {
      flex: 1,
      width: '100%',
    },
    wrongTypeHint: {
      color: theme.data.negative,
      textAlign: 'center',
    },
    detail: {
      fontFamily: 'monospace',
      textAlign: 'center',
    },
  });
