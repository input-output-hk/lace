import {
  AuthSecret,
  useAuthSecretManager,
} from '@lace-contract/authentication-prompt';
import { useTranslation } from '@lace-contract/i18n';
import {
  Text,
  Button,
  spacing,
  Column,
  Row,
  radius,
  useTheme,
  getShadowStyle,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeDataTestId } from './data-test-id';
import { PasswordFieldInput } from './passwordFieldInput';

import type { PasswordAuthPromptUIHandles } from './types';
import type { Theme } from '@lace-lib/ui-toolkit';

/**
 * Live seconds remaining until the absolute unlock-backoff deadline
 * `backoffUntil` (ms epoch), or 0 once it has passed. Drives both the visible
 * countdown and the disabled-submit state that enforce the L-201 backoff at the
 * prompt (the verify side-effect runs synchronously and does not delay).
 *
 * Anchoring on the persisted absolute deadline — rather than a duration snapshot
 * taken at mount — keeps the countdown correct across prompt remounts and store
 * rehydration; a remount mid-window resumes counting to the same instant.
 */
const useUnlockBackoffSeconds = (backoffUntil: number): number => {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, backoffUntil - Date.now()),
  );
  useEffect(() => {
    const compute = () => Math.max(0, backoffUntil - Date.now());
    setRemainingMs(compute());
    if (backoffUntil <= Date.now()) return;
    const intervalId = setInterval(() => {
      const remaining = compute();
      setRemainingMs(remaining);
      // Stop as soon as the window closes: backoffUntil lingers as a past
      // timestamp (cleared only on a successful unlock), so nothing else would
      // stop the interval and it would keep ticking for the prompt's lifetime.
      if (remaining === 0) {
        clearInterval(intervalId);
      }
    }, 250);
    return () => {
      clearInterval(intervalId);
    };
  }, [backoffUntil]);
  return Math.ceil(remainingMs / 1000);
};

export const PasswordAuthPrompt = ({
  onCancel,
  onConfirm,
  state,
  shouldShowBiometricUnlockOffer,
  onSwitchToBiometric,
  unlockBackoffUntil = 0,
}: PasswordAuthPromptUIHandles) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { getAuthSecret, isAuthSecretPresent, setAuthSecret, clearAuthSecret } =
    useAuthSecretManager();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // L-201 unlock backoff, enforced here at the prompt: after a failed attempt
  // the submit is disabled with a live countdown until the exponential backoff
  // elapses. Enforcing before submission — rather than delaying the verify —
  // keeps the auth secret's memory lifetime short and avoids reading a secret
  // the UI has already zeroed (see password-side-effects.ts).
  const backoffSecondsRemaining = useUnlockBackoffSeconds(unlockBackoffUntil);
  const isThrottled =
    state.status === 'OpenPassword' && backoffSecondsRemaining > 0;
  // While throttled the field is locked and its error slot shows the countdown,
  // superseding the "incorrect password" error; once the backoff elapses the
  // field re-enables and reverts to that error.
  const isPasswordInputEditable =
    state.status === 'OpenPassword' && !isThrottled;
  const isConfirmDisabled =
    state.status === 'VerifyingPassword' || !isAuthSecretPresent || isThrottled;
  const inputError = isThrottled
    ? t('authentication-prompt.retry-countdown', {
        seconds: backoffSecondsRemaining,
      })
    : state.status === 'OpenPassword' && state.authSecretError
    ? t('authentication-prompt.error')
    : undefined;

  const submit = async () => {
    if (isConfirmDisabled || !isAuthSecretPresent) return;

    const authSecret = AuthSecret.fromUTF8(getAuthSecret());
    clearAuthSecret();
    await onConfirm(authSecret);
    authSecret.fill(0);
  };

  const shouldRenderBiometricButton = useMemo(() => {
    return (
      shouldShowBiometricUnlockOffer &&
      (state.status === 'OpenPassword' || state.status === 'VerifyingPassword')
    );
  }, [shouldShowBiometricUnlockOffer, state.status]);

  useEffect(() => {
    if (state.status !== 'Idle') return;
    clearAuthSecret();
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'OpenPassword') {
      setIsPasswordVisible(false);
    }
  }, [state.status]);

  const handleTogglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible(v => !v);
  }, []);

  if (state.status === 'Idle') return null;

  return (
    <View style={styles.container}>
      <Column gap={spacing.L} testID={makeDataTestId('body')}>
        <Text.M testID={makeDataTestId('message')}>
          {t(state.config.message)}
        </Text.M>
        <PasswordFieldInput
          autoFocus
          autoCapitalize="none"
          editable={isPasswordInputEditable}
          error={inputError}
          isPasswordVisible={isPasswordVisible}
          label={t('authentication-prompt.input-label')}
          onChangeText={value => {
            setAuthSecret({ value });
          }}
          onSubmitEditing={() => {
            if (isConfirmDisabled) return;
            void submit();
          }}
          onTogglePasswordVisibility={handleTogglePasswordVisibility}
          secureTextEntry={!isPasswordVisible}
          spellCheck={false}
          testID={makeDataTestId('input')}
          textContentType="password"
          togglePasswordVisibilityTestID={
            isPasswordVisible
              ? makeDataTestId('input-hide-password')
              : makeDataTestId('input-show-password')
          }
          value={getAuthSecret()}
        />
        <Row justifyContent={'space-between'} gap={spacing.M}>
          {state.config.cancellable && (
            <View style={styles.buttonContainer}>
              <Button.Secondary
                label={t('authentication-prompt.cancel-button-label')}
                onPress={onCancel}
                testID={makeDataTestId('button-cancel')}
              />
            </View>
          )}
          {shouldRenderBiometricButton && (
            <Button.Secondary
              onPress={() => {
                onSwitchToBiometric();
              }}
              preIconName="FingerPrint"
            />
          )}
          <View style={styles.buttonContainer}>
            <Button.Primary
              label={t(state.config.confirmButtonLabel)}
              onPress={() => {
                if (isConfirmDisabled) return;
                void submit();
              }}
              testID={makeDataTestId('button-confirm')}
              loading={state.status === 'VerifyingPassword'}
              disabled={isThrottled}
            />
          </View>
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
      ...getShadowStyle({ theme, variant: 'overlay' }),
    },
    buttonContainer: {
      flex: 1,
    },
  });
