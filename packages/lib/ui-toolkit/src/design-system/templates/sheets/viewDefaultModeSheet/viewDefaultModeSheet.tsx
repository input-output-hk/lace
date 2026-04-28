import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Text } from '../../../atoms';
import {
  RadioGroup,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

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
  const { onDefaultModeChange, onConfirm, onClose } = actions;
  const { confirmButtonText, cancelButtonText, sheetHeaderTitle, title } =
    labels;
  const { options, selectedMode } = utils;
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={sheetHeaderTitle}
        testID={'default-view-mode-sheet-header'}
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Column
          style={styles.container}
          alignItems="flex-start"
          gap={spacing.L}>
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
      <SheetFooter
        secondaryButton={{
          label: cancelButtonText,
          onPress: onClose,
          testID: 'default-view-mode-sheet-cancel-button',
        }}
        primaryButton={{
          label: confirmButtonText,
          onPress: onConfirm,
          testID: 'default-view-mode-sheet-confirm-button',
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginLeft: spacing.M,
  },
});
