import type { TextInputProps } from 'react-native';

import {
  Text,
  Icon,
  radius,
  spacing,
  useTheme,
  type Theme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

export type PasswordFieldInputProps = Pick<
  TextInputProps,
  | 'autoCapitalize'
  | 'autoFocus'
  | 'onSubmitEditing'
  | 'spellCheck'
  | 'textContentType'
> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  editable?: boolean;
  secureTextEntry: boolean;
  isPasswordVisible: boolean;
  onTogglePasswordVisibility: () => void;
  testID?: string;
  togglePasswordVisibilityTestID: string;
};

/**
 * Password field styled like the shared small text input, with a small prop
 * surface and a row layout so the visibility control is not stacked under the
 * native TextInput touch target (reliable on Android).
 */
export const PasswordFieldInput = ({
  label,
  value,
  onChangeText,
  error,
  editable = true,
  secureTextEntry,
  isPasswordVisible,
  onTogglePasswordVisibility,
  testID,
  togglePasswordVisibilityTestID,
  autoCapitalize,
  autoFocus,
  onSubmitEditing,
  spellCheck,
  textContentType,
}: PasswordFieldInputProps) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const styles = useMemo(
    () =>
      getStyles(theme, {
        hasError: !!error,
        isFocused,
        isDisabled: !editable,
      }),
    [theme, error, isFocused, editable],
  );

  const valueTestID = testID ? `${testID}-value` : 'input-value';
  const labelTestID = testID ? `${testID}-label` : undefined;
  const errorTestID = testID ? `${testID}-input-error` : undefined;

  return (
    <View
      style={styles.outer}
      testID={testID}
      accessibilityState={{ disabled: !editable }}>
      <View style={styles.fieldShell}>
        <View style={styles.fieldInner}>
          <View style={styles.inputColumn}>
            <Text.XS
              variant="secondary"
              style={styles.label}
              testID={labelTestID}>
              {label}
            </Text.XS>
            <TextInput
              autoCapitalize={autoCapitalize}
              autoFocus={autoFocus}
              spellCheck={spellCheck}
              textContentType={textContentType}
              editable={editable}
              onChangeText={onChangeText}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              onSubmitEditing={onSubmitEditing}
              placeholderTextColor={theme.text.tertiary}
              secureTextEntry={secureTextEntry}
              style={styles.textInput}
              value={value}
              testID={valueTestID}
              underlineColorAndroid="transparent"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!editable}
            hitSlop={12}
            onPress={onTogglePasswordVisibility}
            style={({ pressed }) => [
              styles.toggle,
              pressed && styles.togglePressed,
            ]}
            testID={togglePasswordVisibilityTestID}>
            <Icon name={isPasswordVisible ? 'View' : 'ViewOff'} />
          </Pressable>
        </View>
      </View>
      {error ? (
        <Text.XS style={styles.errorText} testID={errorTestID}>
          {error}
        </Text.XS>
      ) : null}
    </View>
  );
};

const getStyles = (
  theme: Theme,
  {
    hasError,
    isFocused,
    isDisabled,
  }: {
    hasError: boolean;
    isFocused: boolean;
    isDisabled: boolean;
  },
) => {
  const borderColor = hasError
    ? theme.data.negative
    : isFocused
    ? theme.border.focused
    : theme.border.middle;

  return StyleSheet.create({
    outer: {
      marginHorizontal: spacing.XS,
    },
    fieldShell: {
      backgroundColor: theme.background.secondary,
      borderRadius: radius.S,
      borderWidth: 1,
      borderColor,
      opacity: isDisabled ? 0.5 : 1,
      overflow: 'hidden',
      paddingVertical: spacing.XS,
    },
    fieldInner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.XS,
      minHeight: Platform.select({ android: 48, default: 44 }),
    },
    inputColumn: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    label: {
      marginLeft: spacing.S,
      marginBottom: 2,
    },
    textInput: {
      marginLeft: spacing.S,
      paddingVertical: 2,
      fontSize: 16,
      color: isDisabled ? theme.text.tertiary : theme.text.primary,
    },
    toggle: {
      alignSelf: 'center',
      padding: spacing.S,
      borderRadius: radius.squareRounded,
      backgroundColor: theme.background.secondary,
    },
    togglePressed: {
      opacity: 0.85,
    },
    errorText: {
      marginTop: spacing.XS,
      marginLeft: spacing.S,
      color: theme.data.negative,
    },
  });
};
