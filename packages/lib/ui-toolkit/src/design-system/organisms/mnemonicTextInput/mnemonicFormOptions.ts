import { formOptions } from '@tanstack/react-form';

export const mnemonicFormOptions = formOptions({
  defaultValues: {
    passphrase: '',
    isTextInputFocused: false,
  },
});

// Export the inferred type
export type MnemonicFormData = typeof mnemonicFormOptions.defaultValues;
