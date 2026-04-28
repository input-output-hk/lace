import { useStore } from '@tanstack/react-form';
import * as React from 'react';

import { Button } from '../../atoms';

import { useFieldContext } from './mnemonicForm';
import { type MnemonicFormData } from './mnemonicFormOptions';

const WORD_COUNT_LENGTHS = {
  SHORT: 12,
  MEDIUM: 15,
  LONG: 24,
};

export const MnemonicNextButton = ({
  nextButtonLabel,
  onPress,
}: {
  nextButtonLabel: string;
  onPress: () => void;
}) => {
  const field = useFieldContext<string>();

  const [isSubmitDisabled] = useStore(field.form.store, state => {
    const values = state.values as MnemonicFormData;

    const passphrase = values.passphrase ?? '';
    const wordCount = passphrase.trim().split(/\s+/).filter(Boolean).length;

    const hasCompleteWordCount =
      wordCount === WORD_COUNT_LENGTHS.SHORT ||
      wordCount === WORD_COUNT_LENGTHS.MEDIUM ||
      wordCount === WORD_COUNT_LENGTHS.LONG;

    const hasValidatedOrComplete = !state.isPristine || hasCompleteWordCount;

    const canSubmit = values.isTextInputFocused
      ? hasCompleteWordCount
      : state.isValid && hasValidatedOrComplete;

    return [!canSubmit];
  });

  return (
    <Button.Primary
      flex={1}
      label={nextButtonLabel}
      onPress={onPress}
      testID="next-button"
      size="medium"
      disabled={isSubmitDisabled}
    />
  );
};
