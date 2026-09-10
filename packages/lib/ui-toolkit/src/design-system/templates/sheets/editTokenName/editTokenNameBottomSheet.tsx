import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { Sheet, useSheetSubmit } from '../../../organisms';

interface EditTokenNameBottomSheetProps {
  labels: {
    nameLabel: string;
    tickerLabel: string;
  };
  values: {
    tokenFullName: string;
    tokenShortName: string;
    tokenFullNameError?: string;
    tokenShortNameError?: string;
  };
  actions: {
    onTokenFullNameChange: (value: string) => void;
    onTokenShortNameChange: (value: string) => void;
  };
}

export const EditTokenNameBottomSheet = ({
  labels,
  values,
  actions,
}: EditTokenNameBottomSheetProps) => {
  const submitProps = useSheetSubmit();

  return (
    <Sheet.Scroll contentContainerStyle={styles.sheetContent}>
      <Column gap={spacing.L} style={styles.content}>
        <CustomTextInput
          label={labels.nameLabel}
          value={values.tokenFullName}
          onChangeText={actions.onTokenFullNameChange}
          inputError={values.tokenFullNameError}
          testID="edit-token-name-sheet-name-input"
          {...submitProps}
        />
        <CustomTextInput
          label={labels.tickerLabel}
          value={values.tokenShortName}
          onChangeText={actions.onTokenShortNameChange}
          inputError={values.tokenShortNameError}
          testID="edit-token-name-sheet-ticker-input"
          {...submitProps}
        />
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  sheetContent: {},
  content: {
    marginHorizontal: spacing.S,
    marginTop: spacing.M,
  },
});
