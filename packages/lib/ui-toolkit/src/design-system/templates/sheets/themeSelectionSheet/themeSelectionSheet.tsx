import React, { useMemo } from 'react';

import { Column } from '../../../atoms';
import {
  RadioGroup,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { RadioGroupOption } from '../../../molecules';

interface ThemeSelectionProps {
  options: RadioGroupOption[];
  selectedTheme: string;
  handleThemeChange: (theme: string) => void;
  confirmButtonText: string;
  cancelButtonText: string;
  onConfirm: () => void;
  onClose: () => void;
  sheetHeaderTitle: string;
}

export const ThemeSelection = ({
  options,
  selectedTheme,
  handleThemeChange,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onClose,
  sheetHeaderTitle,
}: ThemeSelectionProps) => {
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={sheetHeaderTitle}
        testID={'theme-selection-sheet-header'}
      />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContainerStyle}>
        <Column alignItems="flex-start">
          <RadioGroup
            options={options}
            direction="column"
            value={selectedTheme}
            onChange={handleThemeChange}
          />
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: cancelButtonText,
          onPress: onClose,
          testID: 'theme-selection-sheet-cancel-button',
        }}
        primaryButton={{
          label: confirmButtonText,
          onPress: onConfirm,
          testID: 'theme-selection-sheet-confirm-button',
        }}
      />
    </>
  );
};
