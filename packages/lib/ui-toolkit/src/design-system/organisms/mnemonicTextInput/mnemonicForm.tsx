import { createFormHook, createFormHookContexts } from '@tanstack/react-form';

import { MnemonicNextButton } from './mnemonicFormNextButton';
import { MnemonicPasteButton } from './mnemonicFormPasteButton';
import { MnemonicTextInput } from './mnemonicTextInput';

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    MnemonicTextInput,
    MnemonicNextButton,
    MnemonicPasteButton,
  },
  formComponents: {},
});
