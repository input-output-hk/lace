import { useTranslation } from '@lace-contract/i18n';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Button, Text } from '../../../atoms';

import { UrScannerView } from './urScannerView';
import { useUrReassembly } from './useUrReassembly';

import type { UrScannerProps } from './urScanner.shared';
import type { Theme } from '../../../../design-tokens';

export type { UrScannerProps, UrResult } from './urScanner.shared';

/**
 * Navigation-free mobile UR scanner. Uses expo-camera native barcode scanning,
 * handles its own camera permission flow, and renders its own cancel button so
 * it can mount as a free-standing overlay outside a navigation screen.
 */
export const UrScanner = ({
  onComplete,
  onCancel,
  onError,
  theme,
}: UrScannerProps) => {
  const { t } = useTranslation();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const { progress, isComplete, receiveFrame } = useUrReassembly({
    onComplete,
    onError,
  });

  const styles = getStyles(theme);
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  const handleOpenSettings = () => {
    void Linking.openSettings();
  };

  const handleRequestPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setIsRequestingPermission(false);
      setHasRequestedOnce(true);
    }
  }, [requestPermission]);

  useEffect(() => {
    if (
      !permission?.granted &&
      permission?.canAskAgain !== false &&
      !hasRequestedOnce
    ) {
      void handleRequestPermission();
    }
  }, [permission, hasRequestedOnce, handleRequestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void getPermission();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [getPermission]);

  const handleBarcodeScanned = useCallback(
    ({ data }: { type: string; data: string }) => {
      if (isComplete) return;
      receiveFrame(data);
    },
    [isComplete, receiveFrame],
  );

  if (!permission?.granted) {
    const canAskAgain = permission?.canAskAgain !== false;
    return (
      <View style={styles.permissionContent}>
        <Text.L style={styles.permissionTitle}>
          {t('v2.ur-scanner.permission-denied')}
        </Text.L>
        <Text.M style={styles.permissionMessage}>
          {t('v2.ur-scanner.permission-message')}
        </Text.M>
        <Button.Primary
          label={
            canAskAgain
              ? t('v2.ur-scanner.request-permission')
              : t('v2.ur-scanner.open-settings')
          }
          onPress={canAskAgain ? handleRequestPermission : handleOpenSettings}
          loading={isRequestingPermission}
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
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={isComplete ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
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
      gap: spacing.M,
    },
    scanner: {
      flex: 1,
      width: '100%',
    },
    camera: {
      flex: 1,
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
