import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { CustomTag, CustomTextInput, Row, Text, Toggle } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { NAME_MAX_LENGTH } from '../../../util';

export type WalletBlockchainOption = {
  id: string;
  label: string;
  Icon: React.ComponentType;
  selected: boolean;
  disabled?: boolean;
  onToggle: (selected: boolean) => void;
  testID?: string;
};

export interface CreateWalletSheetTemplateProps {
  title: string;
  nameLabel: string;
  nameValue: string;
  onNameChange: (value: string) => void;
  nameError?: string;
  description: string;
  options: WalletBlockchainOption[];
  cancelLabel: string;
  onCancel: () => void;
  confirmLabel: string;
  onConfirm: () => void;
  isConfirmDisabled?: boolean;
  isLoading?: boolean;
  nameTestID?: string;
  cancelTestID?: string;
  confirmTestID?: string;
}

export const CreateWalletSheetTemplate = ({
  title,
  nameLabel,
  nameValue,
  onNameChange,
  nameError,
  description,
  options,
  cancelLabel,
  onCancel,
  confirmLabel,
  onConfirm,
  isConfirmDisabled = false,
  isLoading = false,
  nameTestID = 'create-wallet-name-input',
  cancelTestID = 'create-wallet-cancel',
  confirmTestID = 'create-wallet-confirm',
}: CreateWalletSheetTemplateProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        testID="create-wallet-sheet"
        contentContainerStyle={styles.contentContainer}>
        <CustomTextInput
          isWithinBottomSheet
          animatedLabel
          label={nameLabel}
          value={nameValue}
          onChangeText={onNameChange}
          inputError={nameError}
          testID={nameTestID}
          maxLength={NAME_MAX_LENGTH}
        />
        <Text.S variant="secondary">{description}</Text.S>
        <View style={styles.optionsContainer}>
          {options.map(
            ({ id, Icon, label, selected, disabled, onToggle, testID }) => (
              <Row
                key={id}
                style={styles.optionRow}
                gap={spacing.M}
                alignItems="center"
                justifyContent="space-between">
                <View style={styles.tagWrapper}>
                  <CustomTag
                    backgroundType="transparent"
                    icon={<Icon />}
                    label={label}
                    testID={testID ? `${testID}-tag` : undefined}
                  />
                </View>
                <View style={styles.toggleWrapper}>
                  <Toggle
                    value={selected}
                    onValueChange={onToggle}
                    disabled={disabled}
                    testID={testID}
                  />
                </View>
              </Row>
            ),
          )}
        </View>
      </Sheet.Scroll>
      <SheetFooter
        showDivider={false}
        secondaryButton={{
          label: cancelLabel,
          onPress: onCancel,
          disabled: isLoading,
          testID: cancelTestID,
        }}
        primaryButton={{
          label: confirmLabel,
          onPress: onConfirm,
          disabled: isConfirmDisabled,
          loading: isLoading,
          testID: confirmTestID,
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
      gap: spacing.M,
    },
    optionsContainer: {
      gap: spacing.M,
    },
    optionRow: {
      paddingVertical: spacing.S,
      width: '100%',
    },
    tagWrapper: {
      flex: 1,
      alignItems: 'flex-start',
      minWidth: 0,
    },
    toggleWrapper: {
      flexShrink: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default CreateWalletSheetTemplate;
