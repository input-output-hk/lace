import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import { RadioGroup } from '../../../molecules';
import { footerHeight, Sheet } from '../../../organisms';

import type { RadioGroupOption } from '../../../molecules';

type SelectedMode = 'expanded' | 'popup';

type Actions = {
  onDefaultModeChange: (viewMode: SelectedMode) => void;
  onConfirm: () => void;
  onClose: () => void;
};

type Labels = {
  confirmButtonText: string;
  cancelButtonText: string;
  sheetHeaderTitle: string;
  title: string;
};

type Utils = {
  options: RadioGroupOption[];
  selectedMode: SelectedMode;
};

interface ViewDefaultModeProps {
  actions: Actions;
  labels: Labels;
  utils: Utils;
}

export const ViewDefaultModeTemplate = ({
  actions,
  labels,
  utils,
}: ViewDefaultModeProps) => {
  const { onDefaultModeChange } = actions;
  const { title } = labels;
  const { options, selectedMode } = utils;

  return (
    <Sheet.Scroll showsVerticalScrollIndicator={false}>
      <Column style={styles.container} alignItems="flex-start" gap={spacing.L}>
        <Text.M testID={'default-view-mode-sheet-title'}>{title}</Text.M>
        <RadioGroup
          options={options}
          direction="column"
          value={selectedMode}
          onChange={(value: string) => {
            onDefaultModeChange(value as SelectedMode);
          }}
        />
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: spacing.M,
    paddingBottom: footerHeight.vertical,
  },
});
