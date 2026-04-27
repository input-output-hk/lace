import React from 'react';
import {
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';

import { spacing } from '../../../design-tokens';
import { Text, Button, CustomTextInput, Icon } from '../../atoms';
import { NavigationHeader } from '../../molecules';
import { KEYBOARD_VERTICAL_OFFSET, keyboardBehavior } from '../../util';

import { OnboardingLayout } from './OnboardingLayout';

const keyboardVerticalOffset = Number(KEYBOARD_VERTICAL_OFFSET);

export interface OnboardingDesktopLoginProps {
  onBackPress: () => void;
  onNext: () => void;
  headerTitle: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  nextButtonLabel: string;
  newPassword: string;
  onNewPasswordChange: (password: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (password: string) => void;
  isNewPasswordVisible: boolean;
  onToggleNewPasswordVisibility: () => void;
  isConfirmPasswordVisible: boolean;
  onToggleConfirmPasswordVisibility: () => void;
  isNextDisabled: boolean;
  isNextLoading?: boolean;
  passwordStrengthFeedback?: string;
  inputError?: string;
}

export const OnboardingDesktopLogin: React.FC<OnboardingDesktopLoginProps> = ({
  onBackPress,
  onNext,
  headerTitle,
  newPasswordLabel,
  confirmPasswordLabel,
  nextButtonLabel,
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  isNewPasswordVisible,
  onToggleNewPasswordVisibility,
  isConfirmPasswordVisible,
  onToggleConfirmPasswordVisibility,
  isNextDisabled,
  isNextLoading = false,
  passwordStrengthFeedback,
  inputError,
}) => {
  const styles = getStyles();

  const handleOutsideTap = () => {
    Keyboard.dismiss();
  };

  return (
    <OnboardingLayout>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}>
        <TouchableWithoutFeedback
          accessible={false}
          onPress={handleOutsideTap}
          testID="password-outside-tap">
          <View style={styles.container}>
            <NavigationHeader title={headerTitle} onBackPress={onBackPress} />
            <View style={styles.content}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text.S variant="primary" testID="new-password-label">
                    {newPasswordLabel}
                  </Text.S>
                  <CustomTextInput
                    value={newPassword}
                    onChangeText={onNewPasswordChange}
                    secureTextEntry={!isNewPasswordVisible}
                    testID="new-password-input"
                    postButton={{
                      icon: (
                        <Icon
                          name={isNewPasswordVisible ? 'View' : 'ViewOff'}
                        />
                      ),
                      onPress: onToggleNewPasswordVisibility,
                      testID: isNewPasswordVisible
                        ? 'new-password-hide-icon'
                        : 'new-password-show-icon',
                    }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text.S variant="primary" testID="confirm-password-label">
                    {confirmPasswordLabel}
                  </Text.S>
                  <CustomTextInput
                    value={confirmPassword}
                    onChangeText={onConfirmPasswordChange}
                    secureTextEntry={!isConfirmPasswordVisible}
                    testID="confirm-password-input"
                    postButton={{
                      icon: (
                        <Icon
                          name={isConfirmPasswordVisible ? 'View' : 'ViewOff'}
                        />
                      ),
                      onPress: onToggleConfirmPasswordVisibility,
                      testID: isConfirmPasswordVisible
                        ? 'confirm-password-hide-icon'
                        : 'confirm-password-show-icon',
                    }}
                    onSubmitEditing={() => {
                      if (!isNextDisabled) {
                        onNext();
                      }
                    }}
                    inputError={inputError}
                  />
                  <Text.S
                    style={[
                      styles.warningText,
                      !passwordStrengthFeedback && styles.invisibleText,
                    ]}>
                    {passwordStrengthFeedback || ' '}
                  </Text.S>
                </View>
              </View>

              <Button.Primary
                label={nextButtonLabel}
                onPress={onNext}
                disabled={isNextDisabled}
                loading={isNextLoading}
                testID="next-btn"
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </OnboardingLayout>
  );
};

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.L,
      paddingBottom: spacing.M,
      justifyContent: 'space-between',
    },
    form: {
      flex: 1,
      gap: spacing.M,
      justifyContent: 'center',
    },
    inputGroup: {
      gap: spacing.S,
    },
    warningText: {
      paddingHorizontal: spacing.S,
      minHeight: 48,
    },
    invisibleText: {
      opacity: 0,
    },
  });
