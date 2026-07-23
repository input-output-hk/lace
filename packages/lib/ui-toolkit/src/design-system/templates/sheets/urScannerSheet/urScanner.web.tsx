import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Button, Text } from '../../../atoms';

import { UrScannerView } from './urScannerView';
import { useUrReassembly } from './useUrReassembly';
import { useWebCameraScan } from './useWebCameraScan.web';

import type { UrScannerProps } from './urScanner.shared';
import type { Theme } from '../../../../design-tokens';
import type { TranslationKey } from '@lace-contract/i18n';

export type { UrScannerProps, UrResult } from './urScanner.shared';

const VIDEO_STYLE: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * Navigation-free extension UR scanner. Runs in the tab/expanded view where
 * getUserMedia is available, decodes frames with the bundled jsQR, and renders
 * its own cancel button so it can mount as a free-standing overlay. When the
 * camera cannot start it shows the reason plus an "Allow camera access" button
 * that re-requests on a user gesture, so Chrome can surface its prompt.
 */
export const UrScanner = ({
  onComplete,
  onCancel,
  onError,
  theme,
}: UrScannerProps) => {
  const { t } = useTranslation();
  const { progress, isComplete, receiveFrame } = useUrReassembly({
    onComplete,
    onError,
  });
  const { videoRef, permission, errorMessage, requestCamera } =
    useWebCameraScan({
      onFrame: receiveFrame,
      isComplete,
    });

  const styles = getStyles(theme);
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  if (permission === 'denied') {
    return (
      <View style={styles.permissionContent}>
        <Text.L style={styles.permissionTitle}>
          {t('v2.ur-scanner.permission-denied')}
        </Text.L>
        <Text.M style={styles.permissionMessage}>
          {t(
            (errorMessage as TranslationKey) ??
              'v2.ur-scanner.permission-message',
          )}
        </Text.M>
        <Button.Primary
          label={t('v2.ur-scanner.request-permission')}
          onPress={requestCamera}
        />
        <Button.Secondary
          label={t('v2.ur-scanner.cancel')}
          onPress={onCancel}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.scanner}>
        <UrScannerView
          progress={progress}
          instruction={t('v2.ur-scanner.title')}
          progressLabel={t('v2.ur-scanner.progress', {
            percent: String(percent),
          })}
          theme={theme}
          camera={
            <video
              ref={videoRef}
              style={VIDEO_STYLE}
              muted
              playsInline
              autoPlay
            />
          }
        />
      </View>
      <Button.Secondary label={t('v2.ur-scanner.cancel')} onPress={onCancel} />
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      gap: spacing.M,
    },
    // Bound the preview so the camera feed does not fill the whole tab.
    scanner: {
      flex: 1,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    permissionContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.XL,
      gap: spacing.M,
    },
    permissionTitle: {
      textAlign: 'center',
    },
    permissionMessage: {
      textAlign: 'center',
      color: theme.text.secondary,
    },
  });
