import type { ImageSourcePropType } from 'react-native';

import React from 'react';
import {
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { assets } from '../../assets';
import { Button, CustomTextInput, Icon, Text } from '../../atoms';
import { KEYBOARD_VERTICAL_OFFSET, keyboardBehavior } from '../../util';

const keyboardVerticalOffset = Number(KEYBOARD_VERTICAL_OFFSET);

interface LockScreenProps {
  title: string;
  subtitle: string;
  password: string;
  onPasswordChange: (password: string) => void;
  isPasswordVisible: boolean;
  onTogglePasswordVisibility: () => void;
  passwordPlaceholder: string;
  unlockButtonLabel: string;
  onUnlock: () => void;
  isUnlockDisabled?: boolean;
  isUnlocking?: boolean;
  inputError?: string;
  /** When provided, a biometric-unlock button is shown. */
  biometricButtonLabel?: string;
  onBiometricPress?: () => void;
  /**
   * When provided, a cancel button is shown. The lock gate omits it (the only
   * exits are a correct password/biometric); re-authentication prompts supply it
   * so the user can dismiss the challenge.
   */
  cancelButtonLabel?: string;
  onCancel?: () => void;
}

/**
 * Full-screen lock gate (presentation only): password entry + Unlock, with an
 * optional biometric button. No back/close — the only exits are a correct
 * password or biometric. Rendered over the app while locked.
 */
export const LockScreen = ({
  title,
  subtitle,
  password,
  onPasswordChange,
  isPasswordVisible,
  onTogglePasswordVisibility,
  passwordPlaceholder,
  unlockButtonLabel,
  onUnlock,
  isUnlockDisabled = false,
  isUnlocking = false,
  inputError,
  biometricButtonLabel,
  onBiometricPress,
  cancelButtonLabel,
  onCancel,
}: LockScreenProps) => {
  const styles = createStyles();
  const { theme } = useTheme();
  const imageSource = (
    theme.name === 'dark' ? assets.darkBackground : assets.lightBackground
  ) as ImageSourcePropType;

  return (
    <ImageBackground
      source={imageSource}
      resizeMode="cover"
      style={styles.background}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        <TouchableWithoutFeedback
          accessible={false}
          onPress={Keyboard.dismiss}
          testID="lock-screen-outside-tap">
          <View style={styles.content}>
            <View style={styles.header}>
              <Text.Header variant="primary" testID="lock-screen-title">
                {title}
              </Text.Header>
              <Text.S
                style={styles.subtitleText}
                variant="primary"
                testID="lock-screen-subtitle">
                {subtitle}
              </Text.S>
            </View>

            <View style={styles.form}>
              <CustomTextInput
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry={!isPasswordVisible}
                placeholder={passwordPlaceholder}
                testID="lock-screen-password-input"
                inputError={inputError}
                onSubmitEditing={() => {
                  if (!isUnlockDisabled) onUnlock();
                }}
                postButton={{
                  icon: <Icon name={isPasswordVisible ? 'View' : 'ViewOff'} />,
                  onPress: onTogglePasswordVisibility,
                  testID: isPasswordVisible
                    ? 'lock-screen-password-hide-icon'
                    : 'lock-screen-password-show-icon',
                }}
              />

              <Button.Primary
                label={unlockButtonLabel}
                onPress={onUnlock}
                disabled={isUnlockDisabled}
                loading={isUnlocking}
                testID="lock-screen-unlock-button"
              />

              {!!biometricButtonLabel && !!onBiometricPress && (
                <Button.Secondary
                  preIconName="FingerPrint"
                  label={biometricButtonLabel}
                  onPress={onBiometricPress}
                  testID="lock-screen-biometric-button"
                />
              )}

              {!!cancelButtonLabel && !!onCancel && (
                <Button.Tertiary
                  label={cancelButtonLabel}
                  onPress={onCancel}
                  testID="lock-screen-cancel-button"
                />
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const createStyles = () =>
  StyleSheet.create({
    background: {
      flex: 1,
      width: '100%',
    },
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingBottom: spacing.XXL,
      paddingHorizontal: spacing.L,
      paddingTop: spacing.XXL,
    },
    form: {
      gap: spacing.M,
    },
    header: {
      gap: spacing.M,
      marginTop: spacing.XXL,
    },
    subtitleText: {
      marginVertical: spacing.M,
    },
  });
