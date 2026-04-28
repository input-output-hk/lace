import type { BlurEvent, FocusEvent } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useLayoutEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { type TextInput as RNTextInputType } from 'react-native';

import { spacing } from '../../../design-tokens';
import { CustomTextInput } from '../../atoms/customTextInput/customTextInput';

import { useFieldContext } from './mnemonicForm';

export type MnemonicTextInputProps = React.ComponentProps<
  typeof CustomTextInput
> & {
  onBlur?: () => void;
  onFocus?: () => void;
  placeholderText?: string;
  testID?: string;
  isWithinBottomSheet?: boolean;
};

export const MnemonicTextInput = ({
  onBlur,
  onFocus,
  placeholderText,
  testID,
  isWithinBottomSheet,
  ...restProps
}: MnemonicTextInputProps) => {
  const field = useFieldContext<string>();
  const fieldError = (field.state.meta.errors?.[0] as string) ?? '';

  const { t } = useTranslation();
  const label =
    placeholderText ?? t('onboarding.restore-wallet.input.description');

  const inputRef = useRef<RNTextInputType>(null);
  const currentTestID = testID ?? field.name;

  useLayoutEffect(() => {
    if (!inputRef.current || !currentTestID) return;
    inputRef.current.setNativeProps?.({ testID: currentTestID });
  }, [currentTestID]);

  const handleBlur = (_event: BlurEvent) => {
    field.form.setFieldValue('isTextInputFocused', false);
    field.handleBlur();
    onBlur?.();
  };

  const handleFocus = (_event: FocusEvent) => {
    field.form.setFieldValue('isTextInputFocused', true);
    if (field.state.meta.errors.length > 0) {
      field.setMeta(previous => ({
        ...previous,
        errorMap: {},
      }));
    }
    onFocus?.();
  };

  return (
    <CustomTextInput
      isWithinBottomSheet={isWithinBottomSheet}
      ref={inputRef}
      testID={currentTestID}
      label={label}
      size="large"
      numberOfLines={4}
      multiline
      value={field.state.value}
      onBlur={handleBlur}
      onChangeText={field.handleChange}
      onFocus={handleFocus}
      inputError={fieldError}
      styleOverrides={styleOverrides}
      {...restProps}
    />
  );
};

export const styleOverrides = StyleSheet.create({
  blurView: {
    margin: 0,
    paddingVertical: spacing.S,
  },
  container: {
    paddingHorizontal: spacing.S,
    paddingBottom: spacing.M,
    gap: spacing.XS,
    height: 'auto',
  },
  input: {
    lineHeight: spacing.L,
    marginLeft: 0,
    marginBottom: 0,
    height: 'auto',
  },
  inputLarge: {
    paddingTop: 0,
  },
  staticLabel: {
    marginLeft: 0,
    left: 0,
    top: 0,
  },
});
