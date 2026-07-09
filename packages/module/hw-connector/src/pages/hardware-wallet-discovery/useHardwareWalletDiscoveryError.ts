import { useTranslation } from '@lace-contract/i18n';
import { isStatus } from '@lace-lib/util-store';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { TranslationKey } from '@lace-contract/i18n';

const BLUETOOTH_OFF_TRANSLATION_KEY =
  'v2.hardware-wallet.error.bluetooth-off' as TranslationKey;

const openBluetoothSettings = () => {
  if (Platform.OS === 'ios') {
    void Linking.openSettings();
    return;
  }
  void Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
};

export const useHardwareWalletDiscoveryError = () => {
  const { t } = useTranslation();
  const state = useLaceSelector('hwConnectorMobile.selectState');
  const dispatchRetry = useDispatchLaceAction('hwConnectorMobile.retry');
  const dispatchCancel = useDispatchLaceAction('hwConnectorMobile.cancel');

  const errorTranslationKey = isStatus(state, 'Error')
    ? state.errorTranslationKey
    : ('v2.hardware-wallet.error.unknown' as TranslationKey);

  const promptedForKeyRef = useRef<TranslationKey | undefined>(undefined);
  const handleAlertCancel = useCallback(
    () => dispatchCancel(),
    [dispatchCancel],
  );
  useEffect(() => {
    if (errorTranslationKey !== BLUETOOTH_OFF_TRANSLATION_KEY) return;
    if (promptedForKeyRef.current === errorTranslationKey) return;
    promptedForKeyRef.current = errorTranslationKey;
    Alert.alert(
      t('v2.hardware-wallet.bluetooth-off.alert.title'),
      t('v2.hardware-wallet.bluetooth-off.alert.message'),
      [
        {
          text: t('v2.hardware-wallet.bluetooth-off.alert.cancel'),
          style: 'cancel',
          onPress: handleAlertCancel,
        },
        {
          text: t('v2.hardware-wallet.bluetooth-off.alert.open-settings'),
          onPress: openBluetoothSettings,
        },
      ],
    );
  }, [errorTranslationKey, t, handleAlertCancel]);

  return {
    title: t('v2.hardware-wallet.error.title'),
    errorMessage: t(errorTranslationKey),
    instructionText: t('v2.hardware-wallet.error.ensureConnected'),
    detailText: t('v2.hardware-wallet.error.instruction'),
    linkText: t('v2.hardware-wallet.error.here'),
    retryButtonLabel: t('v2.hardware-wallet.error.tryAgain'),
    cancelButtonLabel: t('app.cancel'),
    onRetry: dispatchRetry,
    onClose: dispatchCancel,
  };
};
