import { createFormHookContexts } from '@tanstack/react-form';

// Leaf module: imported by mnemonicForm.tsx and the mnemonic field components,
// which must not import each other (circular dependency breaks module
// evaluation order under Metro's graph optimizer).
//
// Deliberately NOT `export const { fieldContext, ... } = createFormHookContexts()`:
// Expo's experimental tree-shaking (EXPO_UNSTABLE_TREE_SHAKING) cannot link
// destructured exports to their importers and drops them from the bundle,
// leaving the imports undefined at runtime.
const contexts = createFormHookContexts();

export const fieldContext = contexts.fieldContext;
export const useFieldContext = contexts.useFieldContext;
export const formContext = contexts.formContext;
export const useFormContext = contexts.useFormContext;
