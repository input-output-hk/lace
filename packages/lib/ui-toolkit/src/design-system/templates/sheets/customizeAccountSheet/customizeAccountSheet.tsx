import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, CustomTextInput } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

interface actionProps {
  onSubmit: () => void;
  onCancel: () => void;
  onChangeText: (text: string) => void;
}

interface copiesProps {
  headerTitle: string;
  inputLabel: string;
  secondaryButtonLabel: string;
  primaryButtonLabel: string;
}

interface utilsProps {
  nameValue: string;
  nameError?: string;
  isDisabled: boolean;
}

interface EditAccountSheetProps {
  actions: actionProps;
  copies: copiesProps;
  utils: utilsProps;
}

export const CustomizeAccountSheet = ({
  actions,
  copies,
  utils,
}: EditAccountSheetProps) => {
  const { onSubmit, onCancel, onChangeText } = actions;

  const { nameValue, nameError, isDisabled } = utils;

  const { headerTitle, inputLabel, secondaryButtonLabel, primaryButtonLabel } =
    copies;

  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={headerTitle} />
      <Sheet.Scroll>
        <Column
          gap={spacing.L}
          testID="customize-account-sheet"
          style={styles.container}>
          <CustomTextInput
            isWithinBottomSheet
            testID="customize-account-name-input"
            label={inputLabel}
            value={nameValue}
            onChangeText={onChangeText}
            inputError={nameError}
            size="small"
            animatedLabel
            maxLength={NAME_MAX_LENGTH}
          />
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={{
          label: secondaryButtonLabel,
          onPress: onCancel,
          testID: 'customize-account-cancel-button',
        }}
        primaryButton={{
          label: primaryButtonLabel,
          onPress: onSubmit,
          disabled: isDisabled,
          testID: 'customize-account-confirm-button',
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    container: {
      paddingBottom: footerHeight,
    },
  });
