import { useTranslation } from '@lace-contract/i18n';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View, Linking } from 'react-native';

import { radius, spacing } from '../../../../design-tokens';
import { Text } from '../../../atoms';
import { SheetFooter } from '../../../molecules';

import type { Theme } from '../../../../design-tokens';
export interface QrScannerSheetProps {
  onScan: (data: string) => void;
  onClose: () => void;
  validateScan?: (data: string) => boolean;
  theme: Theme;
}

export const QrScannerSheet = ({
  onScan,
  onClose,
  validateScan,
  theme,
}: QrScannerSheetProps) => {
  const { t } = useTranslation();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [isScanned, setIsScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequestedOnce, setHasRequestedOnce] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const styles = getStyles(theme);

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
    if (!permission?.granted && permission?.canAskAgain !== false) {
      if (!hasRequestedOnce) {
        void handleRequestPermission();
      }
    }
  }, [permission, hasRequestedOnce, handleRequestPermission]);

  // Refresh permission when returning from Settings or app resuming
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

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (isScanned) return;

    setIsScanned(true);

    // Validate the scanned data if validator is provided
    if (validateScan && !validateScan(data)) {
      setError(t('v2.send-flow.qr-scanner.invalid-qr'));
      setTimeout(() => {
        setIsScanned(false);
        setError(null);
      }, 2000);
      return;
    }

    onScan(data);
  };

  if (!permission?.granted) {
    return (
      <>
        <View style={styles.permissionContent}>
          <Text.L style={styles.permissionTitle}>
            {t('v2.send-flow.qr-scanner.permission-denied')}
          </Text.L>
          <Text.M style={styles.permissionMessage}>
            {t('v2.send-flow.qr-scanner.permission-message')}
          </Text.M>
        </View>
        <SheetFooter
          primaryButton={{
            label:
              permission?.canAskAgain === false
                ? t('v2.send-flow.qr-scanner.open-settings')
                : t('v2.send-flow.qr-scanner.request-permission'),
            onPress:
              permission?.canAskAgain === false
                ? handleOpenSettings
                : handleRequestPermission,
            loading: isRequestingPermission,
          }}
          secondaryButton={
            permission?.canAskAgain === false
              ? undefined
              : {
                  label: t('v2.send-flow.qr-scanner.open-settings'),
                  onPress: handleOpenSettings,
                }
          }
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isScanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />

        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text.M style={styles.errorText}>{error}</Text.M>
            </View>
          )}

          <Text.L style={styles.instructionText}>
            {t('v2.send-flow.qr-scanner.title')}
          </Text.L>
        </View>
      </View>
      <SheetFooter
        primaryButton={{
          label: t('v2.send-flow.qr-scanner.done'),
          onPress: onClose,
        }}
      />
    </>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    cameraContainer: {
      flex: 1,
      marginVertical: spacing.L,
      borderRadius: radius.L,
      overflow: 'hidden',
      position: 'relative',
    },
    camera: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      width: 280,
      height: 280,
      position: 'relative',
    },
    corner: {
      position: 'absolute',
      width: 50,
      height: 50,
      borderColor: theme.brand.white,
      borderWidth: 5,
    },
    topLeft: {
      top: 0,
      left: 0,
      borderBottomWidth: 0,
      borderRightWidth: 0,
      borderTopLeftRadius: radius.M,
    },
    topRight: {
      top: 0,
      right: 0,
      borderBottomWidth: 0,
      borderLeftWidth: 0,
      borderTopRightRadius: radius.M,
    },
    bottomLeft: {
      bottom: 0,
      left: 0,
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomLeftRadius: radius.M,
    },
    bottomRight: {
      bottom: 0,
      right: 0,
      borderTopWidth: 0,
      borderLeftWidth: 0,
      borderBottomRightRadius: radius.M,
    },
    instructionText: {
      position: 'absolute',
      bottom: spacing.XXL,
      color: theme.brand.white,
    },
    permissionLoading: {
      flex: 1,
      marginVertical: spacing.L,
      borderRadius: radius.L,
      backgroundColor: theme.background.primary,
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
      marginTop: spacing.M,
    },
    permissionMessage: {
      textAlign: 'center',
      color: theme.text.secondary,
    },
    errorContainer: {
      position: 'absolute',
      top: spacing.XXL * 2,
      backgroundColor: theme.background.negative,
      paddingHorizontal: spacing.L,
      paddingVertical: spacing.M,
      borderRadius: spacing.S,
    },
    errorText: {
      color: theme.text.primary,
      textAlign: 'center',
    },
  });
