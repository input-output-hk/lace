import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../../design-tokens';
import {
  Column,
  CustomTag,
  CustomTextInput,
  Row,
  Text,
  Toggle,
} from '../../../atoms';
import { footerHeight } from '../../../organisms';
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
  nameLabel: string;
  nameValue: string;
  onNameChange: (value: string) => void;
  nameError?: string;
  description: string;
  options: WalletBlockchainOption[];
  cancelLabel?: string;
  onCancel?: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  isConfirmDisabled?: boolean;
  isLoading?: boolean;
  nameTestID?: string;
  cancelTestID?: string;
  confirmTestID?: string;
}

export const CreateWalletSheetTemplate = ({
  nameLabel,
  nameValue,
  onNameChange,
  nameError,
  description,
  options,
  nameTestID = 'create-wallet-name-input',
}: CreateWalletSheetTemplateProps) => {
  return (
    <Column
      gap={spacing.M}
      testID="create-wallet-sheet"
      style={styles.contentContainer}>
      <CustomTextInput
        animatedLabel
        label={nameLabel}
        value={nameValue}
        onChangeText={onNameChange}
        inputError={nameError}
        testID={nameTestID}
        maxLength={NAME_MAX_LENGTH}
      />
      <Text.S variant="secondary">{description}</Text.S>
      <Column gap={spacing.M}>
        {options.map(
          ({ id, Icon, label, selected, disabled, onToggle, testID }) => (
            <Row
              key={id}
              style={styles.optionRow}
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
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: spacing.M,
    paddingBottom: footerHeight.horizontal,
  },
  optionRow: {
    paddingVertical: spacing.S,
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
