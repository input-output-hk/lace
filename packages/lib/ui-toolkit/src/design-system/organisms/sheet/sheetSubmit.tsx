import type { ReactNode } from 'react';
import type { TextInputProps } from 'react-native';

import React, { createContext, useContext, useMemo } from 'react';

export type SheetSubmitAction = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const SheetSubmitContext = createContext<SheetSubmitAction | undefined>(
  undefined,
);

/**
 * Makes a sheet's primary action reachable from the return key of the inputs in
 * its body. `action` must be the same object handed to the primary button, so
 * the key and the button can never disagree about when the form is submittable.
 */
export const SheetSubmitProvider = ({
  action,
  children,
}: {
  action?: SheetSubmitAction;
  children: ReactNode;
}) => (
  <SheetSubmitContext.Provider value={action}>
    {children}
  </SheetSubmitContext.Provider>
);

/**
 * Props to spread onto a SINGLE-LINE TextInput in a sheet body. Returns nothing
 * outside a provider, so shared templates keep their current behaviour where no
 * sheet owns them. Never spread onto a multiline input: the return key must
 * insert a newline there, and react-native-web suppresses submit on `<textarea>`
 * anyway unless `blurOnSubmit` is set.
 */
export const useSheetSubmit = (): Pick<
  TextInputProps,
  'enterKeyHint' | 'onSubmitEditing'
> => {
  const action = useContext(SheetSubmitContext);

  return useMemo<Pick<TextInputProps, 'enterKeyHint' | 'onSubmitEditing'>>(
    () =>
      action
        ? {
            enterKeyHint: 'done',
            onSubmitEditing: () => {
              if (action.disabled || action.loading) return;
              action.onPress();
            },
          }
        : {},
    [action],
  );
};
