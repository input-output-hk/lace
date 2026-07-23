import { createFormHook } from '@tanstack/react-form';

import { fieldContext, formContext } from './mnemonicFormContexts';
import { MnemonicNextButton } from './mnemonicFormNextButton';
import { MnemonicPasteButton } from './mnemonicFormPasteButton';
import { MnemonicTextInput } from './mnemonicTextInput';

export { useFieldContext, useFormContext } from './mnemonicFormContexts';

// NOT `export const { useAppForm } = createFormHook(...)`: Expo's experimental
// tree-shaking (EXPO_UNSTABLE_TREE_SHAKING) cannot link destructured exports to
// their importers and drops them, leaving `useAppForm` undefined at runtime.
const appForm = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    MnemonicTextInput,
    MnemonicNextButton,
    MnemonicPasteButton,
  },
  formComponents: {},
});

export const useAppForm = appForm.useAppForm;
