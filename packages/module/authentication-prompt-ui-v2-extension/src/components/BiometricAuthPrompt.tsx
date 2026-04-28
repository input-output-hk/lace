import { useTranslation } from '@lace-contract/i18n';
import {
  Text,
  Button,
  spacing,
  Column,
  Row,
  radius,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { BiometricAuthPromptUIHandles } from './types';
import type { Theme } from '@lace-lib/ui-toolkit';

export const BiometricAuthPrompt = ({
  onCancel,
  onConfirm,
  state,
  triggerPasswordFlow,
}: BiometricAuthPromptUIHandles) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [retryCount, setRetryCount] = useState(0);

  const hasError = state.status === 'OpenBiometric' && state.authSecretError;
  const androidKeystoreRecovery =
    state.status === 'OpenBiometric'
      ? state.androidKeystoreRecovery
      : undefined;

  const errorMessage = hasError
    ? t('authentication-prompt.biometric.error')
    : undefined;

  const isConfirmDisabled = state.status === 'VerifyingBiometric';

  const handleBiometricAuth = () => {
    if (isConfirmDisabled) return;

    setRetryCount(retryCount + 1);
    onConfirm();
  };

  // Auto-trigger biometric authentication when the prompt opens
  useEffect(() => {
    if (state.status === 'OpenBiometric' && retryCount === 0) {
      handleBiometricAuth();
    }
  }, [state.status, retryCount]);

  if (state.status === 'Idle') return null;

  if (!hasError) return null;

  // Show Android Keystore recovery warning
  if (androidKeystoreRecovery) {
    const { attemptNumber, maxAttempts } = androidKeystoreRecovery;
    const remaining = maxAttempts - attemptNumber;

    return (
      <View style={styles.container}>
        <Column gap={spacing.L}>
          <Column gap={spacing.M} alignItems="center">
            <Text.L style={styles.warningTitle}>
              {t('authentication-prompt.android-keystore-recovery.title')}
            </Text.L>

            <Text.M style={styles.warningText}>
              {t('authentication-prompt.android-keystore-recovery.description')}
            </Text.M>

            <Text.M style={styles.attemptsText}>
              {t(
                'authentication-prompt.android-keystore-recovery.attempts-remaining',
                {
                  current: attemptNumber,
                  max: maxAttempts,
                  remaining,
                },
              )}
            </Text.M>
          </Column>

          <Row>
            <Button.Primary
              flex={1}
              onPress={handleBiometricAuth}
              disabled={isConfirmDisabled}
              loading={false}
              label={t('authentication-prompt.biometric.retry')}
            />
          </Row>
        </Column>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Column gap={spacing.L}>
        <Column gap={spacing.M} alignItems="center">
          <Text.M style={styles.instructionText}>
            {t(state.config.message)}
          </Text.M>

          {errorMessage && (
            <Text.M style={styles.errorText}>{errorMessage}</Text.M>
          )}
        </Column>

        <Row gap={spacing.M}>
          {state.config.cancellable && (
            <Button.Secondary
              flex={1}
              onPress={onCancel}
              label={t('authentication-prompt.cancel')}
            />
          )}

          {state.config.biometricsUnavailable && (
            <Button.Secondary
              flex={1}
              onPress={() => {
                triggerPasswordFlow();
              }}
              label={t('authentication-prompt.use-password-instead')}
            />
          )}

          <Button.Primary
            flex={1}
            onPress={handleBiometricAuth}
            disabled={isConfirmDisabled}
            loading={false}
            label={t('authentication-prompt.biometric.retry')}
          />
        </Row>
      </Column>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.page,
      borderRadius: radius.XL,
      padding: spacing.XL,
    },
    instructionText: {
      textAlign: 'center',
      opacity: 0.7,
    },
    errorText: {
      color: theme.background.negative,
    },
    warningTitle: {
      textAlign: 'center',
      fontWeight: 'bold',
    },
    warningText: {
      textAlign: 'center',
      opacity: 0.8,
    },
    attemptsText: {
      textAlign: 'center',
      color: theme.background.negative,
      fontWeight: '500',
    },
  });
