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
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeDataTestId } from './data-test-id';
import { PasswordFieldInput } from './passwordFieldInput';

import type { PasswordAuthPromptUIHandles } from './types';
import type { Theme } from '@lace-lib/ui-toolkit';

export const PasswordAuthPrompt = ({
  onCancel,
  onConfirm,
  state,
  shouldShowBiometricUnlockOffer,
  onSwitchToBiometric,
}: PasswordAuthPromptUIHandles) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { getAuthSecret, isAuthSecretPresent, setAuthSecret, clearAuthSecret } =
    useAuthSecretManager();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const errorMessage =
    state.status === 'OpenPassword' && state.authSecretError
      ? t('authentication-prompt.error')
      : undefined;
  const isConfirmDisabled =
    state.status === 'VerifyingPassword' || !isAuthSecretPresent;
  const isPasswordInputEditable = state.status === 'OpenPassword';

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
          error={errorMessage}
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
    },
    buttonContainer: {
      flex: 1,
    },
  });
