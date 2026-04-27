import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text, Toggle, Row } from '../../../atoms';
import {
  RadioGroup,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
  type RadioGroupOption,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

export interface SelectAccountSheetParams {
  title: string;
  radioOptions: RadioGroupOption[];
  initialAccountId?: string;
  rememberChoiceLabel: string;
  confirmButtonLabel: string;
  testID?: string;
}

export interface SelectAccountSheetProps {
  title: string;
  radioOptions: RadioGroupOption[];
  selectedAccountId: string;
  onAccountChange: (accountId: string) => void;
  rememberChoice: boolean;
  onRememberChoiceChange: (value: boolean) => void;
  rememberChoiceLabel: string;
  confirmButtonLabel: string;
  onConfirm: () => void;
  isConfirmDisabled?: boolean;
  testID?: string;
}

export const SelectAccountSheet = ({
  title,
  radioOptions,
  selectedAccountId,
  onAccountChange,
  rememberChoice,
  onRememberChoiceChange,
  rememberChoiceLabel,
  confirmButtonLabel,
  onConfirm,
  isConfirmDisabled = false,
  testID = 'select-account-sheet',
}: SelectAccountSheetProps) => {
  const footerHeight = useFooterHeight();
  const sheetStyles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={title} showDivider={false} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={sheetStyles.container}>
        <RadioGroup
          options={radioOptions}
          value={selectedAccountId}
          onChange={onAccountChange}
          direction="column"
          style={sheetStyles.radioGroup}
          testID={`${testID}-radio-group`}
        />

        <Row style={sheetStyles.toggleRow} justifyContent="space-between">
          <Text.S numberOfLines={1}>{rememberChoiceLabel}</Text.S>
          <Toggle
            value={rememberChoice}
            onValueChange={onRememberChoiceChange}
            testID={`${testID}-remember-toggle`}
          />
        </Row>
      </Sheet.Scroll>

      <SheetFooter
        primaryButton={{
          label: confirmButtonLabel,
          onPress: onConfirm,
          disabled: isConfirmDisabled,
          testID: `${testID}-confirm-button`,
        }}
        showDivider={true}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.L,
      paddingBottom: footerHeight,
    },
    radioGroup: {
      marginVertical: spacing.M,
      gap: spacing.M,
      width: '100%',
    },
    toggleRow: {
      marginTop: spacing.M,
    },
  });
