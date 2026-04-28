import type { TextInput as RnTextInputType } from 'react-native';
import type { TextInputProps as RNTextInputProps } from 'react-native';

import React, { forwardRef, useMemo } from 'react';
import { TextInput as RnTextInput, StyleSheet } from 'react-native';

import { Text, Card } from '..';
import { useTheme, radius, spacing } from '../../../design-tokens';
import { isWeb } from '../../util';

import type { CardProps } from '..';
import type { Theme } from '../../../design-tokens';

export type TextInputProps = RNTextInputProps & {
  errorMessage?: string;
  label?: string;
  containerStyle?: CardProps['cardStyle'];
};

export const TextInput = forwardRef<RnTextInputType, TextInputProps>(
  (
    {
      value,
      errorMessage,
      label,
      onChangeText,
      containerStyle,
      testID,
      ...restProps
    },
    ref,
  ) => {
    const { theme } = useTheme();

    const inputStyles = styles(theme);

    const cardStyles = useMemo(
      () => [inputStyles.container, containerStyle].filter(Boolean),
      [inputStyles.container, containerStyle],
    );

    return (
      <Card cardStyle={cardStyles}>
        {label && (
          <Text.S testID={testID ? `${testID}-label` : 'input-label'}>
            {label}
          </Text.S>
        )}
        <RnTextInput
          importantForAutofill="no"
          textContentType="none"
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          secureTextEntry={false}
          value={value}
          onChangeText={onChangeText}
          ref={ref}
          {...restProps}
          style={[inputStyles.input, isWeb ? inputStyles.inputWeb : undefined]}
          testID={testID ? `${testID}-value` : 'input-value'}
        />
        {errorMessage && (
          <Text.XS
            style={inputStyles.withError}
            testID={testID ? `${testID}-error` : 'input-error'}>
            {errorMessage}
          </Text.XS>
        )}
      </Card>
    );
  },
);

const styles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.S,
      paddingHorizontal: spacing.L,
      borderRadius: radius.M,
      borderColor: theme.border.middle,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
      justifyContent: 'center',
    },
    input: {
      color: theme.text.primary,
      textAlignVertical: 'center',
      paddingVertical: 0,
    },
    withError: {
      color: theme.data.negative,
    },
    inputWeb: { outlineStyle: 'solid', outlineWidth: 0 },
  });
